import { useLocation } from "wouter";
import { FaWhatsapp } from "react-icons/fa";

export function WhatsAppButton() {
  const [location] = useLocation();

  const phoneNumber = "917760807137";
  const isOwnerPortal = location.startsWith("/owner");
  // On Discover (mobile) the screens sheet peeks at the bottom — sit above it, not on its buttons
  const isDiscover = /\/discover$/.test(location);

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
      className={`fixed ${isDiscover ? "bottom-[148px] right-4 md:bottom-6 md:right-6 [html[data-discover-sheet=raised]_&]:hidden" : "bottom-6 right-6"} z-[100] bg-[#25D366] hover:bg-[#128C7E] text-white rounded-full p-3.5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center group`}
      aria-label="Contact us on WhatsApp"
    >
      <FaWhatsapp className="w-7 h-7" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 ease-in-out font-medium text-sm">
        Chat with us
      </span>
    </a>
  );
}
