// Shared in-memory store for global system settings
// In production, this would be backed by a database table (SystemSetting)

export const systemConfig = {
    ingestionEnabled: true,
    maintenanceMode: false,
};
