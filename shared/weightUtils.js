// Universal weight conversion utilities
// Handles weight data from multiple sources (Health Connect, Renpho, etc.)
/**
 * Detect the likely unit of a weight value based on typical human weight ranges
 * and data source context
 */
export function detectWeightUnit(weightValue, source, dataContext) {
    // If we have explicit source information
    if (source === 'renpho' || (dataContext === null || dataContext === void 0 ? void 0 : dataContext.source) === 'renpho') {
        return 'lb'; // Renpho typically exports in pounds
    }
    if (source === 'health_connect' || (dataContext === null || dataContext === void 0 ? void 0 : dataContext.source) === 'health_connect') {
        return 'kg'; // Health Connect typically uses metric
    }
    // Heuristic detection based on value ranges
    if (weightValue >= 30 && weightValue <= 200) {
        // Ambiguous range - could be either
        // Use additional context clues
        if (weightValue > 150) {
            return 'lb'; // Very likely pounds (>150 kg would be extremely heavy)
        }
        else if (weightValue < 50) {
            return 'kg'; // Very likely kg (under 50 lb would be underweight)
        }
        return 'unknown'; // Need more context
    }
    if (weightValue > 200) {
        return 'lb'; // Almost certainly pounds
    }
    if (weightValue < 30) {
        return 'kg'; // Almost certainly kg
    }
    return 'unknown';
}
/**
 * Convert weight to pounds, handling multiple input units
 */
export function convertWeightToPounds(weightData) {
    switch (weightData.unit) {
        case 'lb':
            return weightData.value;
        case 'kg':
            return weightData.value * 2.20462; // kg to pounds
        case 'unknown':
            // Try to detect and convert
            var detectedUnit = detectWeightUnit(weightData.value, weightData.source);
            if (detectedUnit === 'kg') {
                return weightData.value * 2.20462;
            }
            else {
                return weightData.value; // Assume pounds if unclear
            }
        default:
            return weightData.value;
    }
}
/**
 * Convert weight to kilograms, handling multiple input units
 */
export function convertWeightToKilograms(weightData) {
    switch (weightData.unit) {
        case 'kg':
            return weightData.value;
        case 'lb':
            return weightData.value / 2.20462; // pounds to kg
        case 'unknown':
            // Try to detect and convert
            var detectedUnit = detectWeightUnit(weightData.value, weightData.source);
            if (detectedUnit === 'lb') {
                return weightData.value / 2.20462;
            }
            else {
                return weightData.value; // Assume kg if unclear
            }
        default:
            return weightData.value;
    }
}
/**
 * Smart weight formatter that handles any weight value and displays in pounds
 */
export function formatWeightInPounds(weightValue, source, dataContext) {
    if (!weightValue)
        return 'No Data';
    var weightData = {
        value: weightValue,
        unit: detectWeightUnit(weightValue, source, dataContext),
        source: source || 'unknown'
    };
    var weightInPounds = convertWeightToPounds(weightData);
    return "".concat(weightInPounds.toFixed(1), " lb");
}
/**
 * Smart weight formatter that handles any weight value and displays in kilograms
 */
export function formatWeightInKilograms(weightValue, source, dataContext) {
    if (!weightValue)
        return 'No Data';
    var weightData = {
        value: weightValue,
        unit: detectWeightUnit(weightValue, source, dataContext),
        source: source || 'unknown'
    };
    var weightInKg = convertWeightToKilograms(weightData);
    return "".concat(weightInKg.toFixed(1), " kg");
}
