import React from 'react';
import * as Icons from 'lucide-react';

interface DynamicIconProps {
  name: string;
  className?: string;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({ name, className }) => {
  // Access the Lucide icon dynamically by string key
  const IconComponent = (Icons as any)[name];

  if (!IconComponent) {
    // Return HelpCircle fallback if the icon string from the database is invalid
    return <Icons.HelpCircle className={className} />;
  }

  return <IconComponent className={className} />;
};

export default DynamicIcon;
