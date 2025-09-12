// utils/data.ts
import { File, Folder } from '../types/types';

const generateRandomName = (prefix: string, length: number = 8): string => {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = prefix;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

const fileTypes = ['pdf', 'docx', 'xlsx', 'jpg', 'png', 'txt'];

export const generateFoldersAndFiles = (numFolders: number = 10): Folder[] => {
  const folders: Folder[] = [];

  for (let i = 0; i < numFolders; i++) {
    const folderName = generateRandomName('AuditReport_', 5);
    const files: File[] = [];
    const numFiles = Math.floor(Math.random() * 4) + 4; // 4 to 7 files

    for (let j = 0; j < numFiles; j++) {
      const fileName = generateRandomName('Document_', 7);
      const fileType = fileTypes[Math.floor(Math.random() * fileTypes.length)];
      files.push({
        id: `file-${i}-${j}`,
        name: `${fileName}.${fileType}`,
        type: fileType,
      });
    }

    folders.push({
      id: `folder-${i}`,
      name: folderName,
      files: files,
    });
  }

  return folders;
};