import { useLocation } from "wouter";
import { MessageCircle } from "lucide-react";

export function WhatsAppButton() {
  const [location] = useLocation();

  const phoneNumber = "917760807137";
  const isOwnerPortal = location.startsWith("/owner");
  
  const message = isOwnerPortal 
    ? "I want to list my digital screen" 
    : "I need help in running outdoor campaign ad";

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-[100] bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center group"
      aria-label="Contact us on WhatsApp"
    >
      <MessageCircle className="w-7 h-7" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 ease-in-out font-medium text-sm">
        Chat with us
      </span>
    </a>
  );
}
