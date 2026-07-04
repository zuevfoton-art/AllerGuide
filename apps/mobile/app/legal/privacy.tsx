import { getLegalDocs } from '@/src/i18n/legal-docs';
import { LegalDocumentScreen } from '@/src/components/LegalDocumentScreen';
import { useTranslation } from '@/src/store/locale-store';

export default function PrivacyPolicyScreen() {
  const { locale } = useTranslation();
  const docs = getLegalDocs(locale);
  return <LegalDocumentScreen title={docs.privacyTitle} body={docs.privacyBody} />;
}
