const fs = require("fs").promises;
const path = require("path");
const FormData = require("form-data");
const fetch = require("node-fetch");
const { error } = require("../../utils/logger");

const LITTERBOX_API_ENDPOINT =
  "https://litterbox.catbox.moe/resources/internals/api.php";
const USER_AGENT = "discord-bot-file-uploader";

const ACCEPTED_DURATIONS = ["1h", "12h", "24h", "72h"];

const FileLifetime = {
  OneHour: "1h",
  TwelveHours: "12h",
  OneDay: "24h",
  ThreeDays: "72h",
};

class LitterboxService {
  constructor() {
    this.serviceName = "litterbox";
  }

  async uploadFile({ filePath, duration = FileLifetime.OneHour }) {
    try {
      const resolvedPath = path.resolve(filePath);

      if (!(await this._isValidFile(resolvedPath))) {
        throw new Error(`Invalid file path: ${resolvedPath}`);
      }

      if (!this._isDurationValid(duration)) {
        throw new Error(
          `Invalid duration "${duration}", accepted values are ${ACCEPTED_DURATIONS.join(
            ", "
          )}`
        );
      }

      const fileBuffer = await fs.readFile(resolvedPath);
      const fileName = path.basename(resolvedPath);

      return await this._uploadBuffer(fileBuffer, fileName, duration);
    } catch (err) {
      error(`Litterbox upload file error: ${err.message}`);
      throw err;
    }
  }

  async uploadFromBuffer({
    buffer,
    filename,
    duration = FileLifetime.OneHour,
  }) {
    try {
      if (!this._isDurationValid(duration)) {
        throw new Error(
          `Invalid duration "${duration}", accepted values are ${ACCEPTED_DURATIONS.join(
            ", "
          )}`
        );
      }

      return await this._uploadBuffer(buffer, filename, duration);
    } catch (err) {
      error(`Litterbox upload buffer error: ${err.message}`);
      throw err;
    }
  }

  async _uploadBuffer(buffer, filename, duration) {
    const formData = new FormData();
    formData.append("reqtype", "fileupload");
    formData.append("fileToUpload", buffer, filename);
    formData.append("time", duration);

    const response = await this._doRequest(formData);

    if (response.startsWith("https://litter.catbox.moe/")) {
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

  _isDurationValid(duration) {
    return ACCEPTED_DURATIONS.includes(duration);
  }

  async _doRequest(formData) {
    const response = await fetch(LITTERBOX_API_ENDPOINT, {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    return await response.text();
  }

  getAcceptedDurations() {
    return ACCEPTED_DURATIONS;
  }

  getFileLifetime() {
    return FileLifetime;
  }
}

module.exports = { LitterboxService, FileLifetime };
