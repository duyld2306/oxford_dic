/**
 * Dependency Injection Container
 * Manages service dependencies and lifecycle
 * 
 * Design Patterns:
 * - Singleton Pattern: Container is a singleton
 * - Factory Pattern: Creates instances on demand
 * - Service Locator Pattern: Centralized service registry
 * 
 * Usage:
 * ```js
 * // Register a service
 * container.register('userService', UserService, ['userRepository', 'logger']);
 * 
 * // Register a singleton
 * container.singleton('logger', logger);
 * 
 * // Resolve a service
 * const userService = container.resolve('userService');
 * ```
 */

export class Container {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.factories = new Map();
  }

  /**
   * Register a service class with dependencies
   * @param {string} name - Service name
   * @param {Function} ServiceClass - Service class constructor
   * @param {Array<string>} dependencies - Array of dependency names
   */
  register(name, ServiceClass, dependencies = []) {
    this.services.set(name, {
      ServiceClass,
      dependencies,
      isSingleton: false,
    });

    return this;
  }

  /**
   * Register a singleton instance
   * @param {string} name - Service name
   * @param {*} instance - Service instance
   */
  singleton(name, instance) {
    this.singletons.set(name, instance);
    return this;
  }

  /**
   * Register a factory function
   * @param {string} name - Service name
   * @param {Function} factory - Factory function
   */
  factory(name, factory) {
    this.factories.set(name, factory);
    return this;
  }

  /**
   * Register a service as singleton
   * @param {string} name - Service name
   * @param {Function} ServiceClass - Service class constructor
   * @param {Array<string>} dependencies - Array of dependency names
   */
  registerSingleton(name, ServiceClass, dependencies = []) {
    this.services.set(name, {
      ServiceClass,
      dependencies,
      isSingleton: true,
    });

    return this;
  }

  /**
   * Resolve a service by name
   * @param {string} name - Service name
   * @returns {*} Service instance
   */
  resolve(name) {
    // Check if it's a singleton instance
    if (this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    // Check if it's a factory
    if (this.factories.has(name)) {
      const factory = this.factories.get(name);
      return factory(this);
    }

    // Check if it's a registered service
    if (this.services.has(name)) {
      const service = this.services.get(name);

      // If it's a singleton service, check if already instantiated
      if (service.isSingleton && this.singletons.has(name)) {
        return this.singletons.get(name);
      }

      // Resolve dependencies
      const dependencies = service.dependencies.map((dep) => this.resolve(dep));

      // Create instance
      const instance = new service.ServiceClass(...dependencies);

      // Cache singleton
      if (service.isSingleton) {
        this.singletons.set(name, instance);
      }

      return instance;
    }

    throw new Error(`Service '${name}' not found in container`);
  }

  /**
   * Check if service is registered
   * @param {string} name - Service name
   * @returns {boolean}
   */
  has(name) {
    return this.services.has(name) || this.singletons.has(name) || this.factories.has(name);
  }

  /**
   * Remove a service from container
   * @param {string} name - Service name
   */
  remove(name) {
    this.services.delete(name);
    this.singletons.delete(name);
    this.factories.delete(name);
    return this;
  }

  /**
   * Clear all services
   */
  clear() {
    this.services.clear();
    this.singletons.clear();
    this.factories.clear();
    return this;
  }

  /**
   * Get all registered service names
   * @returns {Array<string>}
   */
  getServiceNames() {
    return [
      ...this.services.keys(),
      ...this.singletons.keys(),
      ...this.factories.keys(),
    ];
  }

  /**
   * Create a child container with inherited services
   * @returns {Container}
   */
  createChild() {
    const child = new Container();

    // Copy services (not instances)
    for (const [name, service] of this.services.entries()) {
      child.services.set(name, service);
    }

    // Copy factories
    for (const [name, factory] of this.factories.entries()) {
      child.factories.set(name, factory);
    }

    return child;
  }
}

// Create and export singleton container instance
const container = new Container();

export default container;

