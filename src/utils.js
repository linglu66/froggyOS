/**
 * Utility functions for the Swimming Tank
 */

/**
 * Generate a randomized file name with variations
 */
export function generateRandomFileName(baseName) {
    const random = Math.random();

    if (random < 0.3) {
        const prefixes = ['New_', 'Copy_of_', 'Backup_', 'Old_', 'Final_', 'Draft_', ''];
        baseName = prefixes[Math.floor(Math.random() * prefixes.length)] + baseName;
    }

    if (random > 0.7) {
        const suffixes = ['_v2', '_final', '_backup', '_old', '_copy', ''];
        baseName = baseName + suffixes[Math.floor(Math.random() * suffixes.length)];
    }

    if (random > 0.5 && random < 0.6) {
        baseName = baseName + '_' + Math.floor(Math.random() * 100);
    }

    return baseName;
}

/**
 * Generate a randomized PDF file name
 */
export function generateRandomPDFName(baseName) {
    const random = Math.random();

    if (random < 0.3) {
        const prefixes = ['DRAFT_', 'FINAL_', 'REV_', 'v2_', ''];
        baseName = prefixes[Math.floor(Math.random() * prefixes.length)] + baseName;
    }

    if (random > 0.7) {
        const suffixes = ['_signed', '_approved', '_review', '_FINAL', ''];
        baseName = baseName.replace('.pdf', '') + suffixes[Math.floor(Math.random() * suffixes.length)] + '.pdf';
    }

    if (random > 0.5 && random < 0.6) {
        baseName = baseName.replace('.pdf', '') + '_' + Math.floor(Math.random() * 100) + '.pdf';
    }

    return baseName;
}

/**
 * Generate a randomized file size string
 */
export function generateRandomFileSize(baseSize) {
    const match = baseSize.match(/(\d+\.?\d*)\s*(GB|MB|KB)/);
    if (!match) return baseSize;

    const value = parseFloat(match[1]);
    const unit = match[2];

    const variation = 0.5 + Math.random();
    const newValue = (value * variation).toFixed(1);

    return `${newValue} ${unit}`;
}

/**
 * Parse a size string to GB
 */
export function parseSizeToGB(sizeString) {
    const match = sizeString.match(/(\d+\.?\d*)\s*(GB|MB|KB)/);
    if (!match) return 1;

    const value = parseFloat(match[1]);
    const unit = match[2];

    switch (unit) {
        case 'GB': return value;
        case 'MB': return value / 1024;
        case 'KB': return value / (1024 * 1024);
        default: return 1;
    }
}

/**
 * Parse a size string to MB
 */
export function parseSizeToMB(sizeString) {
    const match = sizeString.match(/(\d+\.?\d*)\s*(GB|MB|KB)/);
    if (!match) return 1;

    const value = parseFloat(match[1]);
    const unit = match[2];

    switch (unit) {
        case 'GB': return value * 1024;
        case 'MB': return value;
        case 'KB': return value / 1024;
        default: return 1;
    }
}
