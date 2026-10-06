import {
  AirVent, Battery, BatteryCharging, BatteryWarning, Box, Cable, Camera,
  Check, ChevronRight, CircleAlert, CircleHelp, CircuitBoard, Computer, Cpu,
  Cylinder, Fan, Flame, GlassWater, HardDrive, Keyboard, Languages, Laptop,
  Layers, Lightbulb, Magnet, MapPin, MemoryStick, Microwave, Monitor, Mouse,
  Phone, Plug, Printer, Recycle, Refrigerator, Router, ShieldAlert, ShieldCheck,
  Smartphone, Speaker, Tv, WashingMachine, Wind, Wrench, X, Zap,
} from 'lucide-react';

const registry = {
  AirVent, Battery, BatteryCharging, BatteryWarning, Box, Cable, Camera,
  Check, ChevronRight, CircleAlert, CircleHelp, CircuitBoard, Computer, Cpu,
  Cylinder, Fan, Flame, GlassWater, HardDrive, Keyboard, Languages, Laptop,
  Layers, Lightbulb, Magnet, MapPin, MemoryStick, Microwave, Monitor, Mouse,
  Phone, Plug, Printer, Recycle, Refrigerator, Router, ShieldAlert, ShieldCheck,
  Smartphone, Speaker, Tv, WashingMachine, Wind, Wrench, X, Zap,
};
export type IconName = keyof typeof registry;
export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  const Component = registry[name];
  return <Component size={size} strokeWidth={1.7} aria-hidden="true" />;
}
