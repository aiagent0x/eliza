
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'
import path from "path"

class Resize {
    public folder: string;
    constructor(folder: any) {
        this.folder = folder;
    }
    async save(buffer: any) {
        const filename = Resize.filename();
        const filepath = this.filepath(filename);

        await sharp(buffer)
            .resize(300, 300, { // size image 300x300
                fit: sharp.fit.inside,
                withoutEnlargement: true
            })
            .toFile(filepath);

        return filename;
    }
    static filename() {
        // random file name
        return `${uuidv4()}.png`;
    }
    filepath(filename: any) {
        return path.resolve(`${this.folder}/${filename}`)
    }
}
module.exports = Resize;
