# Store metadata & medical disclaimer (P3.2–P3.3)

**Продукт:** A-Claro · Developer: Aclearo  
**Источник copy:** [`apps/mobile/store.config.json`](../../apps/mobile/store.config.json)  
**Legal in-app:** [`apps/mobile/src/constants/legal.ts`](../../apps/mobile/src/constants/legal.ts), [`legal-docs.ts`](../../apps/mobile/src/i18n/legal-docs.ts)

## Локали (6)

| Locale | Apple key | Android key | Subtitle / short |
|--------|-----------|-------------|------------------|
| English | en-US | en-US | See allergy clearly |
| Russian | ru | ru-RU | Аллергия без тумана |
| Spanish | es-ES | es-ES | Alergias, con claridad |
| French | fr-FR | fr-FR | L’allergie en toute clarté |
| German | de-DE | de-DE | Allergie klar sehen |
| Italian | it | it-IT | Allergie, con chiarezza |

Каждый listing содержит **MEDICAL DISCLAIMER** (не мед. изделие; не диагноз; не замена врача; emergency number).

## Age rating / categories

- Apple: HEALTH_AND_FITNESS + MEDICAL (review notes: decision support, not SaMD)  
- Google: Health & Fitness; declare medical disclaimer in Data safety / content  
- Permissions justification: Camera (barcode), Location (map/pollen), Notifications (diary/pollen reminders), Microphone (optional voice diary)

## Push checklist before soft launch

- [ ] Screenshots 6.7" / 6.5" / Android phone — 6 tabs + SOS + scanner verdict  
- [ ] Privacy Policy live: `https://aclearo.com/legal`  
- [ ] Support URL live  
- [ ] `eas metadata:push` after ASC/Play credentials (brand-rollout Phase 1)  
- [ ] Legal sign-off RU + EN disclaimers  
- [ ] No claims: «лечит», «диагностирует», «100% безопасно»

## ASO keywords (RU primary)

аллергия, аллерген, сканер продуктов, дневник аллергика, пыльца, поллиноз, аллергопаспорт, SOS, aclearo, a-claro

EN: allergy, allergen scanner, pollen, food diary, SOS passport, aclearo
