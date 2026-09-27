import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export type ExportPayload =
  | { kind: 'csv'; fileName: string; content: string }
  | { kind: 'pdf'; fileName: string; html: string };

export type SaveResult = { status: 'saved'; fileName: string } | { status: 'cancelled' };

const LAST_FOLDER_KEY = 'export.lastFolderUri';

const PDF_PAGE = { width: 842, height: 595 };

const MIME = { csv: 'text/csv', pdf: 'application/pdf' } as const;
const UTI = { csv: 'public.comma-separated-values-text', pdf: 'com.adobe.pdf' } as const;

export const canSaveToFolder = Platform.OS === 'android';

function isPickerCancel(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  return e?.code === 'ERR_PICKER_CANCELLED' || /cancel/i.test(e?.message ?? '');
}

async function writeToCache(payload: ExportPayload): Promise<File> {
  const target = new File(Paths.cache, payload.fileName);
  if (target.exists) target.delete();

  if (payload.kind === 'csv') {
    target.create();
    target.write(payload.content);
    return target;
  }
  const { uri } = await Print.printToFileAsync({ html: payload.html, ...PDF_PAGE });
  new File(uri).move(target);
  return target;
}

export async function shareExport(payload: ExportPayload): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device');
  const file = await writeToCache(payload);
  await Sharing.shareAsync(file.uri, {
    mimeType: MIME[payload.kind],
    UTI: UTI[payload.kind],
    dialogTitle: payload.fileName,
  });
}

export async function saveExportToFolder(payload: ExportPayload): Promise<SaveResult> {
  let lastFolder: string | undefined;
  try {
    lastFolder = (await AsyncStorage.getItem(LAST_FOLDER_KEY)) ?? undefined;
  } catch {
    lastFolder = undefined;
  }

  let folder: Awaited<ReturnType<typeof Directory.pickDirectoryAsync>>;
  try {
    folder = await Directory.pickDirectoryAsync(lastFolder);
  } catch (err) {
    if (isPickerCancel(err)) return { status: 'cancelled' };
    throw err;
  }

  const source = await writeToCache(payload);
  const target = folder.createFile(payload.fileName, MIME[payload.kind]);
  target.write(await source.bytes());
  source.delete();

  AsyncStorage.setItem(LAST_FOLDER_KEY, folder.uri).catch(() => {});
  return { status: 'saved', fileName: payload.fileName };
}
