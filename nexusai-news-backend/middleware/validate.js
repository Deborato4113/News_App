// Generic Zod-based request validator.
// Usage: router.post('/signup', validate(signupSchema), signup)
module.exports = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return res.status(400).json({ message: 'Validation failed', errors: issues });
  }

  // Replace body with the parsed/coerced data (e.g. trimmed strings)
  req.body = result.data;
  next();
};
