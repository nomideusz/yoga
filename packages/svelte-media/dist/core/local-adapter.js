import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
export function createLocalAdapter(config) {
    return {
        async put(key, buffer, contentType) {
            const filePath = join(config.root, key);
            await mkdir(dirname(filePath), { recursive: true });
            await writeFile(filePath, buffer);
        },
        async delete(key) {
            await unlink(join(config.root, key)).catch(() => { });
        },
        getUrl(key) {
            return key;
        },
    };
}
