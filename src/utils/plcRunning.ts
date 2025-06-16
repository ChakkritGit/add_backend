export class PlcRunning {
  private static instance: PlcRunning
  private running = 0

  private constructor () {}

  static getInstance (): PlcRunning {
    if (!PlcRunning.instance) {
      PlcRunning.instance = new PlcRunning()
    }
    return PlcRunning.instance
  }

  getRunning () {
    this.running = this.running >= 9 ? 1 : this.running + 1
    return this.running
  }
}
