import { describe, expect, it } from "vitest";

import { buildRoomCapacities } from "../../src/features/allocation/domain/build-room-capacities";

describe("buildRoomCapacities", () => {
  it("builds the K19A baseline room distribution for 272 students in 13 rooms", () => {
    const capacities = buildRoomCapacities(272, 13);

    expect(capacities).toHaveLength(13);
    expect(capacities.filter((room) => room.capacity === 21)).toHaveLength(12);
    expect(capacities.filter((room) => room.capacity === 20)).toHaveLength(1);
  });

  it("rejects room counts larger than the student total", () => {
    expect(() => buildRoomCapacities(3, 4)).toThrow(/roomCount cannot exceed totalStudents/);
  });
});
