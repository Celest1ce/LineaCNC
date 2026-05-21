/**
 * Wrapper pour les routes asynchrones
 * Évite d'avoir à mettre try/catch dans chaque route
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
//# sourceMappingURL=asyncHandler.js.map