import { getLegalDocs } from '@/src/i18n/legal-docs';
import { LegalDocumentScreen } from '@/src/components/LegalDocumentScreen';
import { useTranslation } from '@/src/store/locale-store';

export default function TermsScreen() {
  const { locale } = useTranslation();
  const docs = getLegalDocs(locale);
  return <LegalDocumentScreen title={docs.termsTitle} body={docs.termsBody} />;
}
