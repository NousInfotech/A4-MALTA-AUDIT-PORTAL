import { supabase } from '@/integrations/supabase/client'; // Assuming this path is correct

export async function getUsernameFromUserId(userId: string): Promise<string | null> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('name') // Only select the name column
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error(`Error fetching profile for user ID ${userId}:`, error.message);
      return null;
    }

    if (profile) {
      return profile.name;
    } else {
      return null; // Profile not found for the given userId
    }
  } catch (err) {
    console.error(`Unexpected error fetching name for user ID ${userId}:`, err);
    return null;
  }
}

// Example usage outside of AuthContext:
// async function displayOtherUserName(someOtherUserId: string) {
//   const otherUserName = await getUsernameFromUserId(someOtherUserId);
//   if (otherUserName) {
//     console.log(`The other user's name is: ${otherUserName}`);
//   } else {
//     console.log(`Could not find name for user ID: ${someOtherUserId}`);
//   }
// }