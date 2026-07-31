import { useLocation } from "wouter";

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
      className="fixed bottom-6 right-6 z-[100] bg-[#25D366] hover:bg-[#128C7E] text-white rounded-full p-3.5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center group"
      aria-label="Contact us on WhatsApp"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-7 h-7"
      >
        <path
          fillRule="evenodd"
          d="M1.025 11.597c0-2.825 1.102-5.485 3.104-7.483C6.126 2.115 8.784 1.011 11.606 1.011c5.82 0 10.565 4.73 10.568 10.536 0 2.822-1.1 5.48-3.097 7.476-1.996 1.996-4.653 3.097-7.474 3.097-2.482 0-4.887-.802-6.88-2.28L1.01 20.89l1.082-3.61c-1.503-2.023-2.316-4.453-2.316-6.963zm10.582 9.07c2.31 0 4.545-.733 6.386-2.033l.46-.328 3.524-.954-.972-3.41-.36-.575c-1.424-2.268-2.18-4.888-2.18-7.585 0-5.115-4.17-9.28-9.29-9.28-2.486 0-4.823.966-6.582 2.723-1.76 1.756-2.727 4.09-2.727 6.577 0 2.223.636 4.39 1.84 6.275l.394.616-1.123 3.738 3.864-1.045.596.385c1.826 1.176 3.935 1.797 6.13 1.797z"
          clipRule="evenodd"
        />
        <path
          fillRule="evenodd"
          d="M17.022 13.905c-.29-.145-1.713-.846-1.98-.94-.265-.097-.457-.146-.65.145-.19.292-.746.94-.915 1.135-.168.192-.338.218-.63.072-1.85-.92-3.11-1.764-4.29-3.834-.12-.208-.013-.32.133-.465.13-.13.29-.34.436-.51.144-.17.19-.292.288-.486.096-.195.048-.367-.024-.512-.072-.146-.65-1.567-.892-2.146-.234-.564-.475-.487-.65-.497l-.554-.01c-.193 0-.505.073-.77.365-.265.292-1.01 9.872-1.01 2.398 0 1.412 1.036 2.775 1.18 2.97.146.192 2.023 3.09 4.9 4.333 2.143.923 2.87 1 3.948.844.757-.107 2.34-.954 2.665-1.875.325-.92.325-1.713.228-1.876-.096-.164-.34-.26-.63-.406z"
          clipRule="evenodd"
        />
      </svg>
      <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 ease-in-out font-medium text-sm">
        Chat with us
      </span>
    </a>
  );
}
