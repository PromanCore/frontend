import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/button';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="border-border hover:bg-card text-muted-foreground hover:text-black dark:hover:text-white transition-all"
    >
      {theme === 'dark' ? (
        <>
          <Sun className="w-4 h-4 mr-2" />
          Light
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 mr-2" />
          Dark
        </>
      )}
    </Button>
  );
}