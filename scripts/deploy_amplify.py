"""Deploy frontend/dist directly to AWS Amplify in us-east-1."""

import os
import shutil
import sys
import time
import urllib.request
import zipfile
from pathlib import Path

import boto3

REGION = "us-east-1"
APP_NAME = "KabadiPlus"
BRANCH_NAME = "main"

REPO_ROOT = Path(__file__).resolve().parent.parent
DIST_DIR = REPO_ROOT / "frontend" / "dist"
ZIP_PATH = REPO_ROOT / "frontend_dist.zip"

ENV_VARS = {
    "VITE_API_BASE_URL": "https://s8rzucf885.execute-api.us-east-1.amazonaws.com",
    "VITE_COGNITO_USER_POOL_ID": "us-east-1_SHl0o9DDs",
    "VITE_COGNITO_CLIENT_ID": "38ujskvqqe04gpdo8hupkloqak",
    "VITE_AWS_REGION": "us-east-1",
}

CUSTOM_RULES = [
    {
        "source": "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>",
        "target": "/index.html",
        "status": "200",
    }
]


def zip_dist(dist_dir: Path, zip_path: Path):
    if not dist_dir.exists():
        raise RuntimeError(f"Distribution directory {dist_dir} does not exist. Run npm run build first.")
    if zip_path.exists():
        zip_path.unlink()
    print(f"Packaging {dist_dir} into {zip_path}...")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(dist_dir):
            for file in files:
                file_path = Path(root) / file
                archive_name = file_path.relative_to(dist_dir)
                zf.write(file_path, archive_name)
    print(f"Zip created: {zip_path.stat().st_size} bytes")


def main():
    if not DIST_DIR.exists():
        print(f"Error: {DIST_DIR} not found. Please run 'npm run build' first.")
        sys.exit(1)

    zip_dist(DIST_DIR, ZIP_PATH)

    client = boto3.client("amplify", region_name=REGION)

    # 1. Check or create Amplify App
    print(f"Checking for existing Amplify app named '{APP_NAME}'...")
    apps = client.list_apps()["apps"]
    target_app = next((a for a in apps if a["name"] == APP_NAME), None)

    if not target_app:
        print(f"Creating new Amplify App '{APP_NAME}'...")
        res = client.create_app(
            name=APP_NAME,
            platform="WEB",
            environmentVariables=ENV_VARS,
            customRules=CUSTOM_RULES,
        )
        target_app = res["app"]
        print(f"Created Amplify App: {target_app['appId']}")
    else:
        print(f"Found existing Amplify App: {target_app['appId']}")
        # Ensure custom rules & env vars are up to date
        client.update_app(
            appId=target_app["appId"],
            environmentVariables=ENV_VARS,
            customRules=CUSTOM_RULES,
        )

    app_id = target_app["appId"]
    default_domain = target_app.get("defaultDomain", f"{app_id}.amplifyapp.com")

    # 2. Check or create branch
    print(f"Checking branch '{BRANCH_NAME}' on app {app_id}...")
    try:
        branch = client.get_branch(appId=app_id, branchName=BRANCH_NAME)["branch"]
        print(f"Branch '{BRANCH_NAME}' already exists.")
    except client.exceptions.NotFoundException:
        print(f"Creating branch '{BRANCH_NAME}'...")
        branch = client.create_branch(
            appId=app_id,
            branchName=BRANCH_NAME,
            stage="PRODUCTION",
            enableAutoBuild=False,
        )["branch"]
        print(f"Branch '{BRANCH_NAME}' created.")

    # 3. Create Deployment
    print("Initiating deployment package upload...")
    deployment = client.create_deployment(appId=app_id, branchName=BRANCH_NAME)
    job_id = deployment["jobId"]
    upload_url = deployment["zipUploadUrl"]

    # 4. Upload zip to S3 via presigned PUT URL
    print("Uploading frontend zip bundle to AWS Amplify...")
    zip_bytes = ZIP_PATH.read_bytes()
    req = urllib.request.Request(
        upload_url,
        data=zip_bytes,
        headers={"Content-Type": "application/zip"},
        method="PUT",
    )
    with urllib.request.urlopen(req) as resp:
        if resp.status not in (200, 201):
            raise RuntimeError(f"Zip upload failed with HTTP {resp.status}")
    print("Upload completed!")

    # 5. Start Deployment
    print("Starting Amplify deployment job...")
    client.start_deployment(appId=app_id, branchName=BRANCH_NAME, jobId=job_id)

    # 6. Monitor deployment status
    live_url = f"https://{BRANCH_NAME}.{default_domain}"
    print(f"Monitoring deployment (Job ID: {job_id})...")
    for _ in range(30):
        time.sleep(3)
        job = client.get_job(appId=app_id, branchName=BRANCH_NAME, jobId=job_id)["job"]
        status = job["summary"]["status"]
        print(f"Deployment status: {status}")
        if status == "SUCCEED":
            print("\n" + "=" * 60)
            print("[SUCCESS] AWS AMPLIFY DEPLOYMENT SUCCEEDED!")
            print(f"Live App URL: {live_url}")
            print(f"Amplify App ID: {app_id}")
            print("=" * 60)
            if ZIP_PATH.exists():
                ZIP_PATH.unlink()
            return
        elif status == "FAILED":
            print(f"Deployment failed. Details: {job}")
            sys.exit(1)

    print(f"Deployment is finishing in background. URL: {live_url}")


if __name__ == "__main__":
    main()
