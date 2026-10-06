"""Generated from data/taxonomy.json. Do not edit by hand."""

from typing import Literal

DeviceType = Literal["mobile_phone", "feature_phone", "laptop", "desktop_cpu", "crt_monitor", "lcd_monitor", "crt_tv", "led_tv", "keyboard", "mouse", "printer", "router_modem", "charger_adapter", "cables_wires", "ceiling_fan", "microwave", "washing_machine", "refrigerator", "air_conditioner", "inverter_ups", "battery_pack", "cfl_tube_light", "power_bank", "speaker_audio", "unknown"]
PartId = Literal["pcb_low_grade", "pcb_mid_grade", "pcb_high_grade", "copper_wire", "copper_winding_motor", "copper_transformer", "aluminium_heatsink", "aluminium_body", "steel_frame", "brass_fitting", "plastic_abs", "li_ion_cell", "lead_acid_cell", "compressor_unit", "crt_tube", "lcd_panel", "ram_chip", "cpu_chip", "hdd_drive", "capacitor_large", "magnet_neodymium", "toner_cartridge", "unknown_part", "mercury_lamp", "suspect_insulation", "sealed_container"]
HazardId = Literal["HAZ_LI_ION", "HAZ_LEAD_ACID", "HAZ_CRT_LEAD", "HAZ_MERCURY", "HAZ_REFRIGERANT", "HAZ_CAPACITOR_CHARGE", "HAZ_TONER_DUST", "HAZ_BROKEN_GLASS_LCD", "HAZ_PCB_BURN_FUMES", "HAZ_UNKNOWN_SEALED", "HAZ_ASBESTOS_SUSPECTED"]
MaterialClass = Literal["copper", "aluminium", "brass", "steel", "pcb", "battery_cell", "plastic", "compressor", "other"]
VisionGrade = Literal["low", "mid", "high", "na"]
PriceGrade = Literal["bare_bright", "insulated", "clean", "mixed", "low", "mid", "high", "na"]
Language = Literal["en", "hi"]
Condition = Literal["working", "damaged", "burnt", "unknown"]
