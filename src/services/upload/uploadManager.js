const CatboxService = require("./catboxService");
const { LitterboxService, FileLifetime } = require("./litterboxService");
const { info, error } = require("../../utils/logger");

// Upload service types
const UPLOAD_SERVICES = {
  CATBOX: "catbox",
  LITTERBOX: "litterbox",
};

class UploadManager {
  constructor() {
    this.services = new Map();
    this.defaultService = UPLOAD_SERVICES.CATBOX;
    this._initializeServices();
  }

  _initializeServices() {
    // Initialize Catbox service
    this.services.set(UPLOAD_SERVICES.CATBOX, new CatboxService());

    // Initialize Litterbox service
    this.services.set(UPLOAD_SERVICES.LITTERBOX, new LitterboxService());

    info("Upload services initialized");
  }

  /**
   * Get available upload services
   */
  getAvailableServices() {
    return Object.values(UPLOAD_SERVICES);
  }

  /**
   * Set default service
   */
  setDefaultService(serviceName) {
    if (!this.services.has(serviceName)) {
      throw new Error(`Service "${serviceName}" not available`);
    }
    this.defaultService = serviceName;
    info(`Default upload service set to: ${serviceName}`);
  }

  /**
   * Get default service
   */
  getDefaultService() {
    return this.defaultService;
  }

  /**
   * Get service instance
   */
  getService(serviceName = this.defaultService) {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Upload service "${serviceName}" not found`);
    }
    return service;
  }

  /**
   * Upload file using specified service
   */
  async uploadFile(options, serviceName = this.defaultService) {
    try {
      const service = this.getService(serviceName);
      const result = await service.uploadFile(options);

      info(`File uploaded successfully using ${serviceName}: ${result}`);
      return {
        url: result,
        service: serviceName,
        success: true,
      };
    } catch (err) {
      error(`Upload failed with ${serviceName}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Upload file from URL (Catbox only)
   */
  async uploadFromURL(options, serviceName = UPLOAD_SERVICES.CATBOX) {
    try {
      if (serviceName !== UPLOAD_SERVICES.CATBOX) {
        throw new Error("URL uploads are only supported by Catbox service");
      }

      const service = this.getService(serviceName);
      const result = await service.uploadFromURL(options);

      info(`URL uploaded successfully using ${serviceName}: ${result}`);
      return {
        url: result,
        service: serviceName,
        success: true,
      };
    } catch (err) {
      error(`URL upload failed with ${serviceName}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Upload file from buffer
   */
  async uploadFromBuffer(options, serviceName = this.defaultService) {
    try {
      const service = this.getService(serviceName);
      const result = await service.uploadFromBuffer(options);

      info(`Buffer uploaded successfully using ${serviceName}: ${result}`);
      return {
        url: result,
        service: serviceName,
        success: true,
      };
    } catch (err) {
      error(`Buffer upload failed with ${serviceName}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Set Catbox user hash for account features
   */
  setCatboxUserHash(userHash) {
    const catboxService = this.getService(UPLOAD_SERVICES.CATBOX);
    catboxService.setUserHash(userHash);
    info("Catbox user hash configured");
  }

  /**
   * Create album (Catbox only)
   */
  async createAlbum(options) {
    try {
      const catboxService = this.getService(UPLOAD_SERVICES.CATBOX);
      const result = await catboxService.createAlbum(options);

      info(`Album created successfully: ${result}`);
      return result;
    } catch (err) {
      error(`Album creation failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Delete files (Catbox only)
   */
  async deleteFiles(options) {
    try {
      const catboxService = this.getService(UPLOAD_SERVICES.CATBOX);
      const result = await catboxService.deleteFiles(options);

      info(`Files deleted successfully`);
      return result;
    } catch (err) {
      error(`File deletion failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Get Litterbox durations
   */
  getLitterboxDurations() {
    const litterboxService = this.getService(UPLOAD_SERVICES.LITTERBOX);
    return litterboxService.getAcceptedDurations();
  }

  /**
   * Get Litterbox FileLifetime enum
   */
  getLitterboxFileLifetime() {
    return FileLifetime;
  }
}

// Export singleton instance
module.exports = { UploadManager, UPLOAD_SERVICES, FileLifetime };
