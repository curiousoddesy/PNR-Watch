import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiResponse } from '../types';

// PNR validation schema
export const pnrAddSchema = Joi.object({
  pnr: Joi.string()
    .pattern(/^\d{10}$/)
    .required()
    .messages({
      'string.pattern.base': 'PNR must be exactly 10 digits',
      'any.required': 'PNR is required'
    })
});

// PNR ID parameter validation
export const pnrIdSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid PNR ID format',
      'any.required': 'PNR ID is required'
    })
});

// Batch check validation
export const batchCheckSchema = Joi.object({
  pnrIds: Joi.array()
    .items(Joi.string().uuid())
    .min(1)
    .max(50)
    .optional()
    .messages({
      'array.min': 'At least one PNR ID is required',
      'array.max': 'Maximum 50 PNRs can be checked at once'
    })
});

// History pagination validation
export const historyPaginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional(),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .optional()
});

/**
 * Validation middleware factory
 */
export const validateRequest = (schema: Joi.ObjectSchema, source: 'body' | 'params' | 'query' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const dataToValidate = source === 'body' ? req.body : 
                          source === 'params' ? req.params : 
                          req.query;

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      
      const response: ApiResponse = {
        success: false,
        error: errorMessages.join(', ')
      };
      
      res.status(400).json(response);
      return;
    }

    // Replace the source data with validated and converted values
    if (source === 'body') {
      req.body = value;
    } else if (source === 'params') {
      req.params = value;
    } else {
      req.query = value;
    }

    next();
  };
};