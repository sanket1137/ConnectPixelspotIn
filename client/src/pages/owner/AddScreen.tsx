import { useAuth } from "@/contexts/AuthContext";
import ScreenForm from "@/components/ScreenForm";

export default function AddScreen() {
  const { user } = useAuth();
  
  return (
    <ScreenForm 
      isAdminMode={false}
      currentUserId={user?.id}
    />
  );
}
