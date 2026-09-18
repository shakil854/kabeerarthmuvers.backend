import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { getSystemHealth } from '../services/health.service.js';

/**
 * @desc Check API health and system metrics
 * @route GET /api/v1/health
 * @access Public
 */
export const checkHealth = asyncHandler(async (req, res) => {
  const healthData = await getSystemHealth();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        status: 'online',
        service: 'Kabeer Earth Movers API',
        ...healthData,
      },
      'API is running healthy and ready for requests!'
    )
  );
});
