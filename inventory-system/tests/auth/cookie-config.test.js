import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Cookie Security Configuration Tests', () => {
  let originalEnv;
  let COOKIE_OPTIONS;

  beforeEach(async () => {
    // Save original environment
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    // Restore original environment
    process.env.NODE_ENV = originalEnv;
  });

  describe('Production Cookie Configuration', () => {
    it('should set Secure flag to true in production', async () => {
      // Set production environment
      process.env.NODE_ENV = 'production';
      
      // Dynamic import with cache busting
      const jwtUtils = await import(`../../src/auth/jwt-utils.js?t=${Date.now()}`);
      
      expect(jwtUtils.COOKIE_OPTIONS.secure).toBe(true);
    });

    it('should set SameSite to lax for same-origin via Vercel proxy', async () => {
      process.env.NODE_ENV = 'production';
      
      const jwtUtils = await import(`../../src/auth/jwt-utils.js?t=${Date.now()}`);
      
      // With Vercel rewrites, requests are same-origin, so lax is perfect
      expect(jwtUtils.COOKIE_OPTIONS.sameSite).toBe('lax');
    });

    it('should always set HttpOnly flag', async () => {
      process.env.NODE_ENV = 'production';
      
      const jwtUtils = await import(`../../src/auth/jwt-utils.js?t=${Date.now()}`);
      
      expect(jwtUtils.COOKIE_OPTIONS.httpOnly).toBe(true);
    });

    it('should restrict cookie to /api/auth path', async () => {
      process.env.NODE_ENV = 'production';
      
      const jwtUtils = await import(`../../src/auth/jwt-utils.js?t=${Date.now()}`);
      
      expect(jwtUtils.COOKIE_OPTIONS.path).toBe('/api/auth');
    });

    it('should set 30-day expiration', async () => {
      process.env.NODE_ENV = 'production';
      
      const jwtUtils = await import(`../../src/auth/jwt-utils.js?t=${Date.now()}`);
      
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      expect(jwtUtils.COOKIE_OPTIONS.maxAge).toBe(thirtyDaysInMs);
    });
  });

  describe('Development Cookie Configuration', () => {
    it('should set Secure flag to false in development', async () => {
      process.env.NODE_ENV = 'development';
      
      const jwtUtils = await import(`../../src/auth/jwt-utils.js?t=${Date.now()}`);
      
      expect(jwtUtils.COOKIE_OPTIONS.secure).toBe(false);
    });

    it('should set SameSite to lax in development', async () => {
      process.env.NODE_ENV = 'development';
      
      const jwtUtils = await import(`../../src/auth/jwt-utils.js?t=${Date.now()}`);
      
      expect(jwtUtils.COOKIE_OPTIONS.sameSite).toBe('lax');
    });

    it('should still set HttpOnly in development', async () => {
      process.env.NODE_ENV = 'development';
      
      const jwtUtils = await import(`../../src/auth/jwt-utils.js?t=${Date.now()}`);
      
      expect(jwtUtils.COOKIE_OPTIONS.httpOnly).toBe(true);
    });
  });

  describe('Server Trust Proxy Configuration', () => {
    it('should verify trust proxy is documented in server.js', async () => {
      const fs = await import('fs');
      const path = await import('path');
      
      const serverPath = path.resolve(process.cwd(), 'src/server.js');
      const serverContent = fs.readFileSync(serverPath, 'utf-8');
      
      // Verify trust proxy is set
      expect(serverContent).toContain("app.set('trust proxy', 1)");
      
      // Verify it's set before middleware
      const trustProxyIndex = serverContent.indexOf("app.set('trust proxy'");
      const corsIndex = serverContent.indexOf('app.use(cors');
      
      expect(trustProxyIndex).toBeGreaterThan(-1);
      expect(corsIndex).toBeGreaterThan(-1);
      expect(trustProxyIndex).toBeLessThan(corsIndex);
    });
  });

  describe('CORS Configuration', () => {
    it('should verify CORS allows credentials', async () => {
      const fs = await import('fs');
      const path = await import('path');
      
      const serverPath = path.resolve(process.cwd(), 'src/server.js');
      const serverContent = fs.readFileSync(serverPath, 'utf-8');
      
      expect(serverContent).toContain('credentials: true');
    });

    it('should verify production frontend is in allowed origins', async () => {
      const fs = await import('fs');
      const path = await import('path');
      
      const serverPath = path.resolve(process.cwd(), 'src/server.js');
      const serverContent = fs.readFileSync(serverPath, 'utf-8');
      
      expect(serverContent).toContain('https://card-pilot.vercel.app');
    });
  });

  describe('Cookie Clearing Path Consistency', () => {
    it('should verify clearCookie calls include path option', async () => {
      const fs = await import('fs');
      const path = await import('path');
      
      const authRoutesPath = path.resolve(process.cwd(), 'src/routes/auth-new.js');
      const authContent = fs.readFileSync(authRoutesPath, 'utf-8');
      
      // Find all clearCookie calls
      const clearCookieRegex = /res\.clearCookie\(['"]refreshToken['"]\s*,\s*\{[^}]*path:\s*['"]\/api\/auth['"]/g;
      const matches = authContent.match(clearCookieRegex);
      
      // Should have at least 4 clearCookie calls with path option
      expect(matches).not.toBeNull();
      expect(matches.length).toBeGreaterThanOrEqual(4);
    });
  });
});
