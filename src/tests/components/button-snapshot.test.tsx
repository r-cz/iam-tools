import { describe, expect, test } from 'bun:test';

// Sample data structures to snapshot test
describe('Button Class Generation', () => {
  // Mock function to represent the class generation logic similar to what's in the Button component
  function generateButtonClasses(variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost', 
                               size: 'default' | 'sm' | 'lg', 
                               disabled: boolean = false) {
    // Base classes
    const baseClasses = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
    
    // Variant classes
    const variantClasses = {
      default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
      secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
      destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
      outline: "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
      ghost: "hover:bg-accent hover:text-accent-foreground"
    };
    
    // Size classes
    const sizeClasses = {
      default: "h-9 px-4 py-2",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-10 rounded-md px-8"
    };
    
    return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}${disabled ? ' disabled' : ''}`;
  }
  
  test('should generate correct default button classes', () => {
    const classes = generateButtonClasses('default', 'default');
    expect(classes).toMatchSnapshot();
  });
  
  test('should generate correct secondary button classes', () => {
    const classes = generateButtonClasses('secondary', 'default');
    expect(classes).toMatchSnapshot();
  });
  
  test('should generate correct destructive button classes', () => {
    const classes = generateButtonClasses('destructive', 'default');
    expect(classes).toMatchSnapshot();
  });
  
  test('should generate correct outline button classes', () => {
    const classes = generateButtonClasses('outline', 'default');
    expect(classes).toMatchSnapshot();
  });
  
  test('should generate correct ghost button classes', () => {
    const classes = generateButtonClasses('ghost', 'default');
    expect(classes).toMatchSnapshot();
  });
  
  test('should generate correct small button classes', () => {
    const classes = generateButtonClasses('default', 'sm');
    expect(classes).toMatchSnapshot();
  });
  
  test('should generate correct large button classes', () => {
    const classes = generateButtonClasses('default', 'lg');
    expect(classes).toMatchSnapshot();
  });
  
  test('should generate correct disabled button classes', () => {
    const classes = generateButtonClasses('default', 'default', true);
    expect(classes).toMatchSnapshot();
  });
});
