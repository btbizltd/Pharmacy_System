import { BOT_WHATSAPP_DISPLAY, BOT_WHATSAPP_URL } from '../../config/whatsapp';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';

export function FloatingWhatsAppButton() {
  return (
    <a
      href={BOT_WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/40 transition hover:scale-110 hover:bg-[#20bd5a]"
      aria-label={`Chat on WhatsApp — ${BOT_WHATSAPP_DISPLAY}`}
      title={`WhatsApp bot: ${BOT_WHATSAPP_DISPLAY}`}
    >
      <WhatsAppIcon size={30} />
    </a>
  );
}
