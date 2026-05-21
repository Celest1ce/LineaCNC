import request from 'supertest';
import app from '../app';

describe('Health Check Endpoint', () => {
  it('should return 200 and status ok', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should return a valid timestamp', async () => {
    const response = await request(app).get('/health');

    expect(response.body.timestamp).toBeDefined();
    expect(new Date(response.body.timestamp).toString()).not.toBe('Invalid Date');
  });
});
