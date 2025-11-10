import { useAuth } from "@/contexts/AuthContext";
import ScreenForm from "@/components/ScreenForm";

export default function AddScreenForOwner() {
  const { user } = useAuth();
  
  return (
    <ScreenForm 
      isAdminMode={true}
      currentUserId={user?.id}
    />
  );
}
