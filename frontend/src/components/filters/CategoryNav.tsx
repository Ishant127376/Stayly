"use client";

import { Armchair, Castle, Coffee, Home, Mountain, ShipWheel, Sparkles, Waves, Trees } from "lucide-react";

const categories = [
  { label: "All stays", value: "", icon: Sparkles },
  { label: "Beach", value: "amenity:Beach access", icon: Waves },
  { label: "Amazing views", value: "amenity:Mountain view", icon: Mountain },
  { label: "Cabins", value: "property:cabin", icon: Trees },
  { label: "Pools", value: "property:resort", icon: ShipWheel },
  { label: "Apartments", value: "property:apartment", icon: Armchair },
  { label: "Villas", value: "property:villa", icon: Castle },
  { label: "Houses", value: "property:house", icon: Home },
  { label: "Cottages", value: "property:cottage", icon: Coffee },
];

type CategoryNavProps = {
  selected: string;
  onSelect: (value: string) => void;
};

export function CategoryNav({ selected, onSelect }: CategoryNavProps) {
  return (
    <div className="category-strip" aria-label="Stay categories">
      {categories.map(({ label, value, icon: Icon }) => (
        <button className={`category-item ${selected === value ? "category-item--active" : ""}`} key={label} type="button" onClick={() => onSelect(value)}>
          <Icon size={23} strokeWidth={1.65} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
