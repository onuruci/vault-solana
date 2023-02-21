export class Vault {
  constructor(properties) {
    Object.keys(properties).forEach((key) => {
      this[key] = properties[key];
    });
  }
  static schema = new Map([
    [
      Vault,
      {
        kind: "struct",
        fields: [
          ["admin", [32]],
          ["name", "string"],
          ["description", "string"],
          ["image_link", "string"],
          ["amount", "u64"],
        ],
      },
    ],
  ]);
}
