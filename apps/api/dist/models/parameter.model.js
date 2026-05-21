import prisma from '../lib/prisma.js';
// ==========================================
// MODEL
// ==========================================
export class ParameterModel {
    // ========== PARAMETER DEFINITIONS ==========
    /**
     * Get all parameter definitions
     */
    static async getAllDefinitions() {
        const definitions = await prisma.parameterDefinition.findMany({
            orderBy: { displayOrder: 'asc' }
        });
        return definitions.map(def => ({
            id: def.id,
            parameter_key: def.parameterKey,
            parameter_type: def.parameterType,
            default_value: def.defaultValue,
            min_value: def.minValue ?? undefined,
            max_value: def.maxValue ?? undefined,
            category: def.category ?? undefined,
            display_order: Number(def.displayOrder),
            created_at: Number(def.createdAt),
            updated_at: Number(def.updatedAt)
        }));
    }
    /**
     * Get parameter definition by ID
     */
    static async getDefinitionById(id) {
        const def = await prisma.parameterDefinition.findUnique({
            where: { id }
        });
        if (!def)
            return undefined;
        return {
            id: def.id,
            parameter_key: def.parameterKey,
            parameter_type: def.parameterType,
            default_value: def.defaultValue,
            min_value: def.minValue ?? undefined,
            max_value: def.maxValue ?? undefined,
            category: def.category ?? undefined,
            display_order: Number(def.displayOrder),
            created_at: Number(def.createdAt),
            updated_at: Number(def.updatedAt)
        };
    }
    /**
     * Get parameter definitions by category
     */
    static async getDefinitionsByCategory(category) {
        const definitions = await prisma.parameterDefinition.findMany({
            where: { category },
            orderBy: { displayOrder: 'asc' }
        });
        return definitions.map(def => ({
            id: def.id,
            parameter_key: def.parameterKey,
            parameter_type: def.parameterType,
            default_value: def.defaultValue,
            min_value: def.minValue ?? undefined,
            max_value: def.maxValue ?? undefined,
            category: def.category ?? undefined,
            display_order: Number(def.displayOrder),
            created_at: Number(def.createdAt),
            updated_at: Number(def.updatedAt)
        }));
    }
    // ========== PRINTER PARAMETERS ==========
    /**
     * Get all parameters for a printer (with userId)
     */
    static async getParametersByPrinter(userId, printerId) {
        const params = await prisma.printerParameter.findMany({
            where: {
                userId,
                printerId
            }
        });
        return params.map(param => ({
            user_id: param.userId,
            printer_id: param.printerId,
            parameter_id: param.parameterId,
            value: this.parseValue(param.value),
            updated_at: Number(param.updatedAt)
        }));
    }
    /**
     * Get a specific parameter value
     */
    static async getParameter(userId, printerId, parameterId) {
        const param = await prisma.printerParameter.findUnique({
            where: {
                userId_printerId_parameterId: {
                    userId,
                    printerId,
                    parameterId
                }
            }
        });
        if (!param)
            return undefined;
        return {
            user_id: param.userId,
            printer_id: param.printerId,
            parameter_id: param.parameterId,
            value: this.parseValue(param.value),
            updated_at: Number(param.updatedAt)
        };
    }
    /**
     * Get parameter with its definition
     */
    static async getParameterWithDefinition(userId, printerId, parameterId) {
        const param = await prisma.printerParameter.findUnique({
            where: {
                userId_printerId_parameterId: {
                    userId,
                    printerId,
                    parameterId
                }
            },
            include: {
                definition: true
            }
        });
        if (!param)
            return undefined;
        return {
            user_id: param.userId,
            printer_id: param.printerId,
            parameter_id: param.parameterId,
            value: this.parseValue(param.value),
            updated_at: Number(param.updatedAt),
            parameter_key: param.definition.parameterKey,
            parameter_type: param.definition.parameterType,
            default_value: param.definition.defaultValue,
            min_value: param.definition.minValue ?? undefined,
            max_value: param.definition.maxValue ?? undefined,
            category: param.definition.category ?? undefined
        };
    }
    /**
     * Get all parameters for a printer with their definitions
     */
    static async getAllParametersWithDefinitions(userId, printerId) {
        // Get all parameter definitions
        const definitions = await prisma.parameterDefinition.findMany({
            orderBy: { displayOrder: 'asc' }
        });
        // Get user's parameter values for this printer
        const userValues = await prisma.printerParameter.findMany({
            where: {
                userId,
                printerId
            }
        });
        // Create Map for O(1) lookup (optimized from O(n²) to O(n))
        const userValueMap = new Map(userValues.map(v => [v.parameterId, v]));
        // Merge definitions with user values using O(1) lookup
        const result = definitions.map(def => {
            const userValue = userValueMap.get(def.id);
            return {
                id: def.id,
                parameter_key: def.parameterKey,
                parameter_type: def.parameterType,
                default_value: def.defaultValue,
                min_value: def.minValue ?? undefined,
                max_value: def.maxValue ?? undefined,
                category: def.category ?? undefined,
                display_order: Number(def.displayOrder),
                created_at: Number(def.createdAt),
                updated_at: userValue ? Number(userValue.updatedAt) : Number(def.updatedAt),
                value: userValue ? this.parseValue(userValue.value) : def.defaultValue,
                is_default: !userValue
            };
        });
        return result;
    }
    /**
     * Set/update a parameter value
     */
    static async setParameter(userId, printerId, parameterId, value) {
        const now = BigInt(Date.now());
        await prisma.printerParameter.upsert({
            where: {
                userId_printerId_parameterId: {
                    userId,
                    printerId,
                    parameterId
                }
            },
            update: {
                value: value,
                updatedAt: now
            },
            create: {
                userId,
                printerId,
                parameterId,
                value: value,
                updatedAt: now
            }
        });
    }
    /**
     * Delete a parameter value (revert to default)
     */
    static async deleteParameter(userId, printerId, parameterId) {
        await prisma.printerParameter.delete({
            where: {
                userId_printerId_parameterId: {
                    userId,
                    printerId,
                    parameterId
                }
            }
        });
    }
    /**
     * Delete all parameters for a printer
     */
    static async deleteAllParameters(userId, printerId) {
        await prisma.printerParameter.deleteMany({
            where: {
                userId,
                printerId
            }
        });
    }
    // ========== HELPER METHODS ==========
    /**
     * Parse value with backward compatibility for double-encoded JSON
     * @private
     */
    static parseValue(value) {
        // If it's a string, try to parse it (backward compatibility for double-encoded JSON)
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            }
            catch (e) {
                // If parsing fails, return the original value
                console.warn('Failed to parse parameter value:', e);
                return value;
            }
        }
        // Prisma already handles JSON deserialization for JSON columns
        return value;
    }
}
//# sourceMappingURL=parameter.model.js.map