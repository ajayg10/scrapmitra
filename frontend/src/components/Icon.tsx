import {
  AirVent, Award, BarChart3, Battery, BatteryCharging, BatteryWarning, Box, Cable, Camera,
  Check, ChevronRight, CircleAlert, CircleHelp, CircuitBoard, Computer, Cpu,
  Cylinder, Fan, Flame, GlassWater, HardDrive, Keyboard, Languages, Laptop,
  Layers, Lightbulb, Magnet, MapPin, MemoryStick, Microwave, Monitor, Mouse,
  Navigation, Phone, Play, Plug, Printer, QrCode, Recycle, Refrigerator, RefreshCw,
  Router, ShieldAlert, ShieldCheck, Smartphone, Speaker, Truck, Tv, Upload,
  Users, Volume2, WashingMachine, Wind, Wrench, X, Zap,
} from 'lucide-react';

const registry = {
  AirVent, Award, BarChart3, Battery, BatteryCharging, BatteryWarning, Box, Cable, Camera,
  Check, ChevronRight, CircleAlert, CircleHelp, CircuitBoard, Computer, Cpu,
  Cylinder, Fan, Flame, GlassWater, HardDrive, Keyboard, Languages, Laptop,
  Layers, Lightbulb, Magnet, MapPin, MemoryStick, Microwave, Monitor, Mouse,
  Navigation, Phone, Play, Plug, Printer, QrCode, Recycle, Refrigerator, RefreshCw,
  Router, ShieldAlert, ShieldCheck, Smartphone, Speaker, Truck, Tv, Upload,
  Users, Volume2, WashingMachine, Wind, Wrench, X, Zap,
};

export type IconName = keyof typeof registry;

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  const Component = registry[name];
  if (!Component) return null;
  return <Component size={size} strokeWidth={1.7} aria-hidden="true" />;
}
