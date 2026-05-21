import { Router, Request, Response } from 'express';
import { PrinterModelV2, CompletePrinter, db } from '../models/printer.model.v2.js';
import { ParameterModel } from '../models/parameter.model.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

// ========== PRINTER ROUTES ==========

// Get all printers
router.get('/printers', asyncHandler(async (req: Request, res: Response) => {
  let userId: number | undefined;

  if (req.query.userId) {
    const parsed = parseInt(req.query.userId as string, 10);
    if (isNaN(parsed) || parsed <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid userId: must be a positive integer'
      });
    }
    userId = parsed;
  }

  const printers = await PrinterModelV2.findAll(userId);
  res.json({ success: true, data: printers });
}));

// Get printer by ID
router.get('/printers/:id', asyncHandler(async (req: Request, res: Response) => {
  const printer = await PrinterModelV2.findById(req.params.id);

  if (!printer) {
    return res.status(404).json({ success: false, error: 'Printer not found' });
  }

  res.json({ success: true, data: printer });
}));

// Create or update complete printer (with all relations)
router.post('/printers', asyncHandler(async (req: Request, res: Response) => {
  const data = req.body as CompletePrinter;

  // Lightweight existence check (optimized)
  const existing = await db('printers').where({ id: data.printer.id }).select('id').first();

  if (existing) {
    // Update printer
    await PrinterModelV2.update(data.printer.id, data.printer);
  } else {
    // Create printer
    await PrinterModelV2.create(data.printer);
  }

  // Save relations in parallel (optimized - reduces sequential waits)
  const savePromises: Promise<void>[] = [];

  if (data.config) {
    savePromises.push(PrinterModelV2.saveConfig({ ...data.config, printer_id: data.printer.id }));
  }
  if (data.hardware) {
    savePromises.push(PrinterModelV2.saveHardware({ ...data.hardware, printer_id: data.printer.id }));
  }
  if (data.firmware) {
    savePromises.push(PrinterModelV2.saveFirmware({ ...data.firmware, printer_id: data.printer.id }));
  }
  if (data.port) {
    savePromises.push(PrinterModelV2.savePort({ ...data.port, printer_id: data.printer.id }));
  }
  if (data.state) {
    savePromises.push(PrinterModelV2.saveState({ ...data.state, printer_id: data.printer.id }));
  }

  if (savePromises.length > 0) {
    await Promise.all(savePromises);
  }

  // Return complete printer
  const saved = await PrinterModelV2.findById(data.printer.id);
  res.json({ success: true, data: saved });
}));

// Update printer (main table only)
router.put('/printers/:id', asyncHandler(async (req: Request, res: Response) => {
  const printer = await PrinterModelV2.findById(req.params.id);

  if (!printer) {
    return res.status(404).json({ success: false, error: 'Printer not found' });
  }

  await PrinterModelV2.update(req.params.id, req.body);

  const updated = await PrinterModelV2.findById(req.params.id);
  res.json({ success: true, data: updated });
}));

// Update printer config
router.put('/printers/:id/config', asyncHandler(async (req: Request, res: Response) => {
  const printer = await PrinterModelV2.findById(req.params.id);

  if (!printer) {
    return res.status(404).json({ success: false, error: 'Printer not found' });
  }

  await PrinterModelV2.saveConfig({ ...req.body, printer_id: req.params.id });

  const updated = await PrinterModelV2.findById(req.params.id);
  res.json({ success: true, data: updated });
}));

// Update printer hardware
router.put('/printers/:id/hardware', asyncHandler(async (req: Request, res: Response) => {
  const printer = await PrinterModelV2.findById(req.params.id);

  if (!printer) {
    return res.status(404).json({ success: false, error: 'Printer not found' });
  }

  await PrinterModelV2.saveHardware({ ...req.body, printer_id: req.params.id });

  const updated = await PrinterModelV2.findById(req.params.id);
  res.json({ success: true, data: updated });
}));

// Update printer firmware
router.put('/printers/:id/firmware', asyncHandler(async (req: Request, res: Response) => {
  const printer = await PrinterModelV2.findById(req.params.id);

  if (!printer) {
    return res.status(404).json({ success: false, error: 'Printer not found' });
  }

  await PrinterModelV2.saveFirmware({ ...req.body, printer_id: req.params.id });

  const updated = await PrinterModelV2.findById(req.params.id);
  res.json({ success: true, data: updated });
}));

// Delete printer
router.delete('/printers/:id', asyncHandler(async (req: Request, res: Response) => {
  const printer = await PrinterModelV2.findById(req.params.id);

  if (!printer) {
    return res.status(404).json({ success: false, error: 'Printer not found' });
  }

  await PrinterModelV2.delete(req.params.id);
  res.json({ success: true, message: 'Printer deleted' });
}));

// ========== COMMAND ROUTES ==========

// Get command history
router.get('/printers/:id/commands', asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const commands = await PrinterModelV2.getCommandHistory(req.params.id, limit);

  res.json({ success: true, data: commands });
}));

// Save command
router.post('/printers/:id/commands', asyncHandler(async (req: Request, res: Response) => {
  await PrinterModelV2.createCommand({
    ...req.body,
    printer_id: req.params.id
  });

  res.json({ success: true, data: req.body });
}));

// Clear command history
router.delete('/printers/:id/commands', asyncHandler(async (req: Request, res: Response) => {
  await PrinterModelV2.clearCommandHistory(req.params.id);
  res.json({ success: true, message: 'Command history cleared' });
}));

// ========== LOG ROUTES ==========

// Get logs
router.get('/logs', asyncHandler(async (req: Request, res: Response) => {
  const filter = {
    printerId: req.query.printerId as string,
    levels: req.query.levels ? (req.query.levels as string).split(',') : undefined,
    categories: req.query.categories ? (req.query.categories as string).split(',') : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
  };

  const logs = await PrinterModelV2.getLogs(filter);
  res.json({ success: true, data: logs });
}));

// Create log
router.post('/logs', asyncHandler(async (req: Request, res: Response) => {
  // Convert camelCase to snake_case for database compatibility
  const logData = {
    ...req.body,
    printer_id: req.body.printerId || req.body.printer_id
  };

  // Remove printerId if it exists (we use printer_id instead)
  if ('printerId' in logData) {
    delete logData.printerId;
  }

  // Verify printer exists if printer_id is provided
  if (logData.printer_id) {
    const printer = await PrinterModelV2.findById(logData.printer_id);
    if (!printer) {
      // Printer doesn't exist - set printer_id to null to avoid FK constraint error
      // This allows logging events even if the printer was deleted or never saved
      console.warn(`Warning: Printer ${logData.printer_id} not found. Creating log without printer reference.`);
      logData.printer_id = null;
    }
  }

  await PrinterModelV2.createLog(logData);
  res.json({ success: true, data: logData });
}));

// Create multiple logs in batch (optimized - fixed N+1 problem)
router.post('/logs/batch', asyncHandler(async (req: Request, res: Response) => {
  const logs = req.body;

  if (!Array.isArray(logs)) {
    return res.status(400).json({
      success: false,
      error: 'Request body must be an array of logs'
    });
  }

  if (logs.length === 0) {
    return res.json({ success: true, message: 'No logs to insert' });
  }

  // Extract unique printer IDs (batch verification to fix N+1 problem)
  const printerIds = [...new Set(
    logs
      .map(log => log.printerId || log.printer_id)
      .filter(Boolean)
  )] as string[];

  // Single query to check all printers at once (instead of N queries)
  const validPrinters = printerIds.length > 0
    ? await db('printers').whereIn('id', printerIds).select('id')
    : [];
  const validPrinterSet = new Set(validPrinters.map((p: any) => p.id));

  // Convert all logs from camelCase to snake_case with O(1) printer validation
  const logsData = logs.map(log => {
    const logData = {
      ...log,
      printer_id: log.printerId || log.printer_id
    };

    // Remove printerId if it exists (we use printer_id instead)
    if ('printerId' in logData) {
      delete logData.printerId;
    }

    // Verify printer exists using pre-fetched set (O(1) lookup)
    if (logData.printer_id && !validPrinterSet.has(logData.printer_id)) {
      console.warn(`Warning: Printer ${logData.printer_id} not found. Creating log without printer reference.`);
      logData.printer_id = null;
    }

    return logData;
  });

  await PrinterModelV2.createLogsBatch(logsData);
  res.json({ success: true, message: `${logsData.length} logs created` });
}));

// Clear logs
router.delete('/logs', asyncHandler(async (req: Request, res: Response) => {
  const printerId = req.query.printerId as string;
  await PrinterModelV2.clearLogs(printerId);
  res.json({ success: true, message: 'Logs cleared' });
}));

// ========== STATS ROUTES ==========

// Get stats
router.get('/printers/:id/stats', asyncHandler(async (req: Request, res: Response) => {
  const stats = await PrinterModelV2.getStats(req.params.id);

  if (!stats) {
    // Return default stats
    return res.json({
      success: true,
      data: {
        printer_id: req.params.id,
        total_commands: 0,
        successful_commands: 0,
        failed_commands: 0,
        total_errors: 0,
        total_connection_time: 0,
        average_response_time: 0,
        last_activity: Date.now(),
        updated_at: Date.now()
      }
    });
  }

  res.json({ success: true, data: stats });
}));

// Update stats
router.put('/printers/:id/stats', asyncHandler(async (req: Request, res: Response) => {
  await PrinterModelV2.updateStats(req.params.id, req.body);
  const updated = await PrinterModelV2.getStats(req.params.id);
  res.json({ success: true, data: updated });
}));

// Increment stats (optimized - uses database-level increments)
router.post('/printers/:id/stats/increment', asyncHandler(async (req: Request, res: Response) => {
  const { success, responseTime } = req.body;
  await PrinterModelV2.incrementCommandStats(req.params.id, success, responseTime);
  res.json({ success: true });
}));

// ========== EVENTS ROUTES (NEW) ==========

// Get printer events
router.get('/printers/:id/events', asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const events = await PrinterModelV2.getEvents(req.params.id, limit);

  res.json({ success: true, data: events });
}));

// Log event
router.post('/printers/:id/events', asyncHandler(async (req: Request, res: Response) => {
  await PrinterModelV2.logEvent({
    ...req.body,
    printer_id: req.params.id,
    timestamp: req.body.timestamp || Date.now()
  });

  res.json({ success: true, data: req.body });
}));

// ========== PARAMETER ROUTES ==========

// Get all parameter definitions
router.get('/parameter-definitions', asyncHandler(async (req: Request, res: Response) => {
  const category = req.query.category as string | undefined;

  const definitions = category
    ? await ParameterModel.getDefinitionsByCategory(category)
    : await ParameterModel.getAllDefinitions();

  res.json({ success: true, data: definitions });
}));

// Get parameter definition by ID
router.get('/parameter-definitions/:id', asyncHandler(async (req: Request, res: Response) => {
  const definition = await ParameterModel.getDefinitionById(req.params.id);

  if (!definition) {
    return res.status(404).json({ success: false, error: 'Parameter definition not found' });
  }

  res.json({ success: true, data: definition });
}));

// Get all parameters for a printer
router.get('/printers/:id/parameters', asyncHandler(async (req: Request, res: Response) => {
  // userId is required - in production this should come from session/auth
  const userId = parseInt(req.query.userId as string);

  if (!userId || isNaN(userId)) {
    return res.status(400).json({
      success: false,
      error: 'userId is required and must be a valid number'
    });
  }

  // Check if printer exists
  const printer = await PrinterModelV2.findById(req.params.id);
  if (!printer) {
    return res.status(404).json({ success: false, error: 'Printer not found' });
  }

  const parameters = await ParameterModel.getAllParametersWithDefinitions(
    userId,
    req.params.id
  );

  res.json({ success: true, data: parameters });
}));

// Get specific parameter for a printer
router.get('/printers/:id/parameters/:parameterId', asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.query.userId as string);

  if (!userId || isNaN(userId)) {
    return res.status(400).json({
      success: false,
      error: 'userId is required and must be a valid number'
    });
  }

  const parameter = await ParameterModel.getParameterWithDefinition(
    userId,
    req.params.id,
    req.params.parameterId
  );

  if (!parameter) {
    // Return default value from definition if user hasn't set a custom value
    const definition = await ParameterModel.getDefinitionById(req.params.parameterId);

    if (!definition) {
      return res.status(404).json({ success: false, error: 'Parameter not found' });
    }

    return res.json({
      success: true,
      data: {
        ...definition,
        value: definition.default_value,
        is_default: true
      }
    });
  }

  res.json({ success: true, data: parameter });
}));

// Set/update parameter for a printer
router.put('/printers/:id/parameters/:parameterId', asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.body.userId || req.query.userId);

  if (!userId || isNaN(userId)) {
    return res.status(400).json({
      success: false,
      error: 'userId is required and must be a valid number'
    });
  }

  // Check if printer exists
  const printer = await PrinterModelV2.findById(req.params.id);
  if (!printer) {
    return res.status(404).json({ success: false, error: 'Printer not found' });
  }

  // Check if parameter definition exists
  const definition = await ParameterModel.getDefinitionById(req.params.parameterId);
  if (!definition) {
    return res.status(404).json({ success: false, error: 'Parameter definition not found' });
  }

  // Validate value based on definition
  const value = req.body.value;

  if (definition.parameter_type === 'number') {
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return res.status(400).json({
        success: false,
        error: 'Value must be a number'
      });
    }
    if (definition.min_value !== null && definition.min_value !== undefined && numValue < definition.min_value) {
      return res.status(400).json({
        success: false,
        error: `Value must be at least ${definition.min_value}`
      });
    }
    if (definition.max_value !== null && definition.max_value !== undefined && numValue > definition.max_value) {
      return res.status(400).json({
        success: false,
        error: `Value must be at most ${definition.max_value}`
      });
    }
  }

  await ParameterModel.setParameter(
    userId,
    req.params.id,
    req.params.parameterId,
    value
  );

  const updated = await ParameterModel.getParameterWithDefinition(
    userId,
    req.params.id,
    req.params.parameterId
  );

  res.json({ success: true, data: updated });
}));

// Delete parameter (revert to default)
router.delete('/printers/:id/parameters/:parameterId', asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.query.userId as string);

  if (!userId || isNaN(userId)) {
    return res.status(400).json({
      success: false,
      error: 'userId is required and must be a valid number'
    });
  }

  await ParameterModel.deleteParameter(
    userId,
    req.params.id,
    req.params.parameterId
  );

  res.json({ success: true, message: 'Parameter reset to default' });
}));

// Delete all parameters for a printer (revert all to defaults)
router.delete('/printers/:id/parameters', asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.query.userId as string);

  if (!userId || isNaN(userId)) {
    return res.status(400).json({
      success: false,
      error: 'userId is required and must be a valid number'
    });
  }

  await ParameterModel.deleteAllParameters(userId, req.params.id);

  res.json({ success: true, message: 'All parameters reset to defaults' });
}));

export default router;
