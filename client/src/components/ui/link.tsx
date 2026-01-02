import { Link as WouterLink, useLocation } from "wouter";

export function Link({ href, children, className, ...props }: any) {
  const [location, setLocation] = useLocation();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Handle anchor links on the same page
    if (href.includes('#') || (href === '/' && location === '/')) {
      const [path, hash] = href.split('#');
      // Check if we are on the same page (ignoring trailing slashes for robustness)
      const currentPath = location === '/' ? '' : location;
      const targetPath = path === '/' ? '' : path;

      if (location === path || (path === '/' && location === '/')) {
        if (hash) {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            // Update URL without triggering navigation
            window.history.pushState(null, '', href);
          }
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          window.history.pushState(null, '', href);
        }
        return;
      }
    }

    if (location === href) return;

    setLocation(href);
  };

  return (
    <a href={href} onClick={handleClick} className={className} {...props}>
      {children}
    </a>
  );
}
