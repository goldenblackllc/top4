import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'jpg';
  const storageRef = ref(storage, `avatars/${userId}/avatar.${fileExt}`);

  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return url;
}
