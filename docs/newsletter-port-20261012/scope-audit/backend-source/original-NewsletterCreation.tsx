import { useApiScope } from '../../../../lib/use-api-scope.js';
import { NewsletterTemplateChooser } from './NewsletterTemplateChooser.js';

export function NewsletterCreation() {
  const scope = useApiScope();
  return <NewsletterTemplateChooser key={scope} />;
}
