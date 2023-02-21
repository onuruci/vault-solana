export class WithdrawRequest {
  constructor(properties) {
    Object.keys(properties).forEach((key) => {
      this[key] = properties[key];
    });
  }
  static schema = new Map([
    [
      WithdrawRequest,
      {
        kind: "struct",
        fields: [["amount", "u64"]],
      },
    ],
  ]);
}
