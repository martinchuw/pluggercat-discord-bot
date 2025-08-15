const fs = require("fs").promises;
const path = require("path");
const FormData = require("form-data");
const fetch = require("node-fetch");
const { error, info } = require("../../utils/logger");

const CATBOX_API_ENDPOINT = "https://catbox.moe/user/api.php";
const USER_AGENT = "plugger-cat-bot";

class CatboxService {
  constructor(userHash = null) {
    this.userHash = userHash;
    this.serviceName = "catbox";
  }

  setUserHash(userHash) {
    this.userHash = userHash;
  }

  async uploadFile({ filePath }) {
    try {
      const resolvedPath = path.resolve(filePath);

      if (!(await this._isValidFile(resolvedPath))) {
        throw new Error(`Invalid file path: ${resolvedPath}`);
      }

      const fileBuffer = await fs.readFile(resolvedPath);
      const fileName = path.basename(resolvedPath);

      return await this._uploadBuffer(fileBuffer, fileName);
    } catch (err) {
      error(`Catbox upload file error: ${err.message}`);
      throw err;
    }
  }

  async uploadFromURL({ url }) {
    try {
      const formData = new FormData();
      formData.append("reqtype", "urlupload");
      formData.append("url", url);

      if (this.userHash) {
        formData.append("userhash", this.userHash);
      }

      const response = await this._doRequest(formData);

      if (response.startsWith("https://files.catbox.moe/")) {
        return response;
      } else {
        throw new Error(response);
      }
    } catch (err) {
      error(`Catbox upload URL error: ${err.message}`);
      throw err;
    }
  }

  async uploadFromBuffer({ buffer, filename }) {
    try {
      return await this._uploadBuffer(buffer, filename);
    } catch (err) {
      error(`Catbox upload buffer error: ${err.message}`);
      throw err;
    }
  }

  async _uploadBuffer(buffer, filename) {
    const formData = new FormData();
    formData.append("reqtype", "fileupload");
    formData.append("fileToUpload", buffer, filename);

    if (this.userHash) {
      formData.append("userhash", this.userHash);
    }

    const response = await this._doRequest(formData);

    if (response.startsWith("https://files.catbox.moe/")) {
      return response;
    } else {
      throw new Error(response);
    }
  }

  async _isValidFile(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  async _doRequest(formData) {
    const response = await fetch(CATBOX_API_ENDPOINT, {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    return await response.text();
  }

  // Album management methods (require user hash)
  async createAlbum({ title, description, files = [] }) {
    if (!this.userHash) {
      throw new Error("User hash is required for album operations");
    }

    const formData = new FormData();
    formData.append("reqtype", "createalbum");
    formData.append("title", title);
    formData.append("desc", description);
    formData.append("userhash", this.userHash);

    if (files && files.length) {
      formData.append("files", files.join(" "));
    }

    const response = await this._doRequest(formData);

    if (response.startsWith("https://catbox.moe/c/")) {
      return response;
    } else {
      throw new Error(response);
    }
  }

  async deleteFiles({ files }) {
    if (!this.userHash) {
      throw new Error("User hash is required for file deletion");
    }

    const formData = new FormData();
    formData.append("reqtype", "deletefiles");
    formData.append("userhash", this.userHash);
    formData.append("files", files.join(" "));

    const response = await this._doRequest(formData);

    if (response.includes("successfully")) {
      return true;
    } else {
      throw new Error(response);
    }
  }
}

module.exports = CatboxService;
