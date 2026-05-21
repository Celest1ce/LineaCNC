import knex from 'knex';
import { env } from '../lib/env.js';
// Initialize Knex client
const db = knex({
    client: 'mysql2',
    connection: env.DATABASE_URL
});
// ==========================================
// MODEL
// ==========================================
export class PrinterModelV2 {
    // ========== PRINTERS ==========
    static async create(printer) {
        await db('printers').insert(printer);
    }
    static async findById(id) {
        const printer = await db('printers').where({ id }).first();
        if (!printer)
            return undefined;
        // Load related data in parallel
        const [config, hardware, firmware, port, state] = await Promise.all([
            db('printer_configs').where({ printer_id: id }).first(),
            db('printer_hardware').where({ printer_id: id }).first(),
            db('printer_firmware').where({ printer_id: id }).first(),
            db('printer_ports').where({ printer_id: id }).first(),
            db('printer_states').where({ printer_id: id }).first(),
        ]);
        return {
            printer,
            config,
            hardware,
            firmware,
            port,
            state,
        };
    }
    static async findAll(userId) {
        const query = db('printers').select('*');
        if (userId) {
            query.where({ user_id: userId });
        }
        const printers = await query;
        if (printers.length === 0) {
            return [];
        }
        // Optimization: Load all relations in bulk instead of N+1 queries
        const printerIds = printers.map(p => p.id);
        const [configs, hardwares, firmwares, ports, states] = await Promise.all([
            db('printer_configs').whereIn('printer_id', printerIds),
            db('printer_hardware').whereIn('printer_id', printerIds),
            db('printer_firmware').whereIn('printer_id', printerIds),
            db('printer_ports').whereIn('printer_id', printerIds),
            db('printer_states').whereIn('printer_id', printerIds),
        ]);
        // Create lookup maps for O(1) access
        const configMap = new Map(configs.map(c => [c.printer_id, c]));
        const hardwareMap = new Map(hardwares.map(h => [h.printer_id, h]));
        const firmwareMap = new Map(firmwares.map(f => [f.printer_id, f]));
        const portMap = new Map(ports.map(p => [p.printer_id, p]));
        const stateMap = new Map(states.map(s => [s.printer_id, s]));
        // Build complete printer objects
        return printers.map(printer => ({
            printer,
            config: configMap.get(printer.id),
            hardware: hardwareMap.get(printer.id),
            firmware: firmwareMap.get(printer.id),
            port: portMap.get(printer.id),
            state: stateMap.get(printer.id),
        }));
    }
    static async update(id, data) {
        // Ne jamais mettre à jour id et uuid (clés uniques)
        const { id: _id, uuid: _uuid, ...updateData } = data;
        await db('printers').where({ id }).update({
            ...updateData,
            updated_at: Date.now(),
        });
    }
    static async delete(id) {
        await db('printers').where({ id }).delete();
        // Cascade delete handled by foreign keys
    }
    // ========== CONFIG ==========
    static async saveConfig(config) {
        config.updated_at = Date.now();
        // Upsert atomique avec ON DUPLICATE KEY UPDATE (MySQL)
        await db.raw(`
      INSERT INTO printer_configs (
        printer_id, auto_reconnect, reconnect_delay, max_reconnect_attempts,
        command_timeout, keep_alive_interval, serial_options, custom_settings, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        auto_reconnect = VALUES(auto_reconnect),
        reconnect_delay = VALUES(reconnect_delay),
        max_reconnect_attempts = VALUES(max_reconnect_attempts),
        command_timeout = VALUES(command_timeout),
        keep_alive_interval = VALUES(keep_alive_interval),
        serial_options = VALUES(serial_options),
        custom_settings = VALUES(custom_settings),
        updated_at = VALUES(updated_at)
    `, [
            config.printer_id,
            config.auto_reconnect,
            config.reconnect_delay,
            config.max_reconnect_attempts,
            config.command_timeout,
            config.keep_alive_interval,
            JSON.stringify(config.serial_options),
            config.custom_settings ? JSON.stringify(config.custom_settings) : null,
            config.updated_at
        ]);
    }
    // ========== HARDWARE ==========
    static async saveHardware(hardware) {
        hardware.updated_at = Date.now();
        await db.raw(`
      INSERT INTO printer_hardware (
        printer_id, vendor_id, product_id, manufacturer, serial_number, hardware_specs, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        vendor_id = VALUES(vendor_id),
        product_id = VALUES(product_id),
        manufacturer = VALUES(manufacturer),
        serial_number = VALUES(serial_number),
        hardware_specs = VALUES(hardware_specs),
        updated_at = VALUES(updated_at)
    `, [
            hardware.printer_id,
            hardware.vendor_id || null,
            hardware.product_id || null,
            hardware.manufacturer || null,
            hardware.serial_number || null,
            JSON.stringify(hardware.hardware_specs),
            hardware.updated_at
        ]);
    }
    // ========== FIRMWARE ==========
    static async saveFirmware(firmware) {
        firmware.updated_at = Date.now();
        await db.raw(`
      INSERT INTO printer_firmware (
        printer_id, name, version, build_date, capabilities, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        version = VALUES(version),
        build_date = VALUES(build_date),
        capabilities = VALUES(capabilities),
        updated_at = VALUES(updated_at)
    `, [
            firmware.printer_id,
            firmware.name || null,
            firmware.version || null,
            firmware.build_date || null,
            JSON.stringify(firmware.capabilities),
            firmware.updated_at
        ]);
    }
    // ========== PORT INFO ==========
    static async savePort(port) {
        port.updated_at = Date.now();
        await db.raw(`
      INSERT INTO printer_ports (
        printer_id, usb_vendor_id, usb_product_id, port_metadata, updated_at
      ) VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        usb_vendor_id = VALUES(usb_vendor_id),
        usb_product_id = VALUES(usb_product_id),
        port_metadata = VALUES(port_metadata),
        updated_at = VALUES(updated_at)
    `, [
            port.printer_id,
            port.usb_vendor_id || null,
            port.usb_product_id || null,
            port.port_metadata ? JSON.stringify(port.port_metadata) : null,
            port.updated_at
        ]);
    }
    // ========== STATE ==========
    static async saveState(state) {
        state.updated_at = Date.now();
        await db.raw(`
      INSERT INTO printer_states (
        printer_id, status, state_data, updated_at
      ) VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        state_data = VALUES(state_data),
        updated_at = VALUES(updated_at)
    `, [
            state.printer_id,
            state.status || null,
            state.state_data ? JSON.stringify(state.state_data) : null,
            state.updated_at
        ]);
    }
    // ========== COMMANDS ==========
    static async createCommand(command) {
        await db('commands').insert(command);
    }
    static async getCommandHistory(printerId, limit = 100) {
        return await db('commands')
            .where({ printer_id: printerId })
            .orderBy('timestamp', 'desc')
            .limit(limit);
    }
    static async clearCommandHistory(printerId) {
        await db('commands').where({ printer_id: printerId }).delete();
    }
    // ========== LOGS ==========
    static async createLog(log) {
        await db('logs').insert(log);
    }
    /**
     * Create multiple logs in a single batch operation (optimized)
     */
    static async createLogsBatch(logs) {
        if (logs.length === 0) {
            return;
        }
        // Knex supports batch inserts - much more efficient than individual inserts
        await db('logs').insert(logs);
    }
    static async getLogs(filter) {
        let query = db('logs').orderBy('timestamp', 'desc');
        if (filter?.printerId) {
            query = query.where({ printer_id: filter.printerId });
        }
        if (filter?.levels && filter.levels.length > 0) {
            query = query.whereIn('level', filter.levels);
        }
        if (filter?.categories && filter.categories.length > 0) {
            query = query.whereIn('category', filter.categories);
        }
        if (filter?.limit) {
            query = query.limit(filter.limit);
        }
        else {
            query = query.limit(1000);
        }
        return await query;
    }
    static async clearLogs(printerId) {
        if (printerId) {
            await db('logs').where({ printer_id: printerId }).delete();
        }
        else {
            await db('logs').delete();
        }
    }
    // ========== STATS ==========
    static async getStats(printerId) {
        return await db('printer_stats').where({ printer_id: printerId }).first();
    }
    static async updateStats(printerId, data) {
        const existing = await this.getStats(printerId);
        const statsData = {
            printer_id: printerId,
            total_commands: 0,
            successful_commands: 0,
            failed_commands: 0,
            total_errors: 0,
            total_connection_time: 0,
            average_response_time: 0,
            ...existing,
            ...data,
            updated_at: Date.now(),
        };
        if (existing) {
            await db('printer_stats').where({ printer_id: printerId }).update(statsData);
        }
        else {
            await db('printer_stats').insert(statsData);
        }
    }
    /**
     * Increment command stats using database-level operations (optimized)
     * Avoids read-modify-write pattern for better performance
     */
    static async incrementCommandStats(printerId, success, responseTime) {
        const existing = await this.getStats(printerId);
        if (existing) {
            // Update existing stats with increments
            const updates = {
                total_commands: db.raw('total_commands + 1'),
                last_activity: Date.now(),
                updated_at: Date.now(),
            };
            if (success) {
                updates.successful_commands = db.raw('successful_commands + 1');
                // Update average response time if provided
                if (responseTime !== undefined) {
                    // Calculate new average: (old_avg * old_count + new_time) / (old_count + 1)
                    updates.average_response_time = db.raw(`(average_response_time * successful_commands + ${responseTime}) / (successful_commands + 1)`);
                }
            }
            else {
                updates.failed_commands = db.raw('failed_commands + 1');
            }
            await db('printer_stats').where({ printer_id: printerId }).update(updates);
        }
        else {
            // Create initial stats record
            const statsData = {
                printer_id: printerId,
                total_commands: 1,
                successful_commands: success ? 1 : 0,
                failed_commands: success ? 0 : 1,
                total_errors: 0,
                total_connection_time: 0,
                average_response_time: success && responseTime ? responseTime : 0,
                last_activity: Date.now(),
                updated_at: Date.now(),
            };
            await db('printer_stats').insert(statsData);
        }
    }
    // ========== EVENTS (NEW) ==========
    static async logEvent(event) {
        await db('printer_events').insert(event);
    }
    static async getEvents(printerId, limit = 100) {
        return await db('printer_events')
            .where({ printer_id: printerId })
            .orderBy('timestamp', 'desc')
            .limit(limit);
    }
}
export { db };
//# sourceMappingURL=printer.model.v2.js.map