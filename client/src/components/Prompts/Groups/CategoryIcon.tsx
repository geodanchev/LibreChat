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

// const categoryColorMap: Record<string, string> = {
//   com_ui_general: 'text-[#2F39B1]',
//   com_ui_academy: 'text-[#2F39B1]',
//   com_ui_client_experience: 'text-purple-400',
//   com_ui_it: 'text-yellow-300',
//   com_ui_education_hub: 'text-purple-400',
//   com_ui_engineering: 'text-yellow-300',
//   com_ui_finance: 'text-orange-400',
//   com_ui_management: 'text-orange-400',
//   com_ui_marketing: 'text-blue-300',
//   com_ui_people_and_culture: 'text-blue-300',
//   com_ui_product_management: 'text-blue-300',
//   com_ui_professional_services: 'text-blue-300',
//   com_ui_sales: 'text-blue-300',
//   com_ui_support: 'text-blue-300',
// };

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