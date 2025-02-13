const ScalabilityModeRegex = new RegExp('^[LS]([1-9]\\d{0,1})T([1-9]\\d{0,1})');
export function parse(scalabilityMode) {
    const match = ScalabilityModeRegex.exec(scalabilityMode || '');
    if (match) {
        return {
            spatialLayers: Number(match[1]),
            temporalLayers: Number(match[2])
        };
    }
    else {
        return {
            spatialLayers: 1,
            temporalLayers: 1
        };
    }
}
