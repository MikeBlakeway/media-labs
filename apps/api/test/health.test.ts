import request from 'supertest';
import { app } from '../src/app';

describe('Health endpoint', () => {
  it('should return ok: true on GET /_health', async () => {
    const response = await request(app)
      .get('/_health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual({ ok: true });
  });
});