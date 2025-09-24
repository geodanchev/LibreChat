import React from 'react';
import {
  MessageSquareMore,
  ListChecks,
  UserRoundCheck,
  GraduationCap,
  CircuitBoard,
  TrendingUp,
  Laptop,
  Lightbulb,
  Megaphone,
  Smile,
  Kanban,
  Cog,
  HandCoins,
  Wrench,
  Building,
  Network 
  // NEW: Add these for agent categories
  // Users as UsersIcon,
  // Beaker as BeakerIcon,
  // Settings as SettingsIcon,
} from 'lucide-react';
import { cn } from '~/utils';

const categoryIconMap: Record<string, React.ElementType> = {
com_ui_general: MessageSquareMore,
  com_ui_academy: ListChecks,
  com_ui_client_experience: UserRoundCheck,
  com_ui_education_hub: GraduationCap,
  com_ui_engineering: CircuitBoard,
  com_ui_finance: TrendingUp,
  com_ui_it: Laptop,
  com_ui_management: Lightbulb,
  com_ui_marketing: Megaphone,
  com_ui_people_and_culture: Smile,
  com_ui_product_management: Kanban,
  com_ui_professional_services: Cog,
  com_ui_sales: HandCoins,
  com_ui_strategy_and_controlling: Network,
  com_ui_support: Wrench,
  com_ui_business_applications: Building
};

export default function CategoryIcon({
  category,
  className = '',
}: {
  category: string;
  className?: string;
}) {
  const IconComponent = categoryIconMap[category];
  const colorClass = 'text-text-primary ' + className;
  if (!IconComponent) {
    return null;
  }
  return <IconComponent className={cn(colorClass, className)} aria-hidden="true" />;
}
