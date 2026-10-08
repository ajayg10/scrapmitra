// Generated from data/icons.json. Do not edit by hand.
import type { DeviceType, PartId, HazardId } from "./taxonomy";
import type { IconName } from "../components/Icon";
export const iconMap = {
  "device_type": {
    "mobile_phone": "Smartphone",
    "feature_phone": "Phone",
    "laptop": "Laptop",
    "desktop_cpu": "Computer",
    "crt_monitor": "Monitor",
    "lcd_monitor": "Monitor",
    "crt_tv": "Tv",
    "led_tv": "Tv",
    "keyboard": "Keyboard",
    "mouse": "Mouse",
    "printer": "Printer",
    "router_modem": "Router",
    "charger_adapter": "Plug",
    "cables_wires": "Cable",
    "ceiling_fan": "Fan",
    "microwave": "Microwave",
    "washing_machine": "WashingMachine",
    "refrigerator": "Refrigerator",
    "air_conditioner": "AirVent",
    "inverter_ups": "BatteryCharging",
    "battery_pack": "Battery",
    "cfl_tube_light": "Lightbulb",
    "power_bank": "BatteryCharging",
    "speaker_audio": "Speaker",
    "unknown": "CircleHelp"
  },
  "part_id": {
    "pcb_low": "CircuitBoard",
    "pcb_mid": "CircuitBoard",
    "pcb_high": "CircuitBoard",
    "copper_wire": "Cable",
    "copper_winding": "Fan",
    "aluminium": "Layers",
    "steel": "Box",
    "brass": "Wrench",
    "plastic_abs": "Box",
    "li_ion_cell": "Battery",
    "lead_acid_cell": "Battery",
    "compressor": "Cylinder",
    "crt_tube": "Monitor",
    "lcd_panel": "Monitor",
    "ram_chip": "MemoryStick",
    "cpu_chip": "Cpu",
    "hdd_drive": "HardDrive",
    "capacitor_large": "Zap",
    "magnet_neodymium": "Magnet",
    "toner_cartridge": "Printer",
    "unknown_part": "CircleHelp"
  },
  "hazard_id": {
    "HAZ_LI_ION": "BatteryWarning",
    "HAZ_LEAD_ACID": "BatteryWarning",
    "HAZ_CRT_LEAD": "Monitor",
    "HAZ_MERCURY": "Lightbulb",
    "HAZ_REFRIGERANT": "Wind",
    "HAZ_CAPACITOR_CHARGE": "Zap",
    "HAZ_TONER_DUST": "Printer",
    "HAZ_BROKEN_GLASS_LCD": "GlassWater",
    "HAZ_PCB_BURN_FUMES": "Flame",
    "HAZ_UNKNOWN_SEALED": "CircleAlert"
  }
} as const satisfies {
  device_type: Record<DeviceType, IconName>;
  part_id: Record<PartId, IconName>;
  hazard_id: Record<HazardId, IconName>;
};
