export default class ArrayUtils {
  static findCommonSlice<T>(array1: T[], array2: T[]): T[] {
    let i = 0;
    const shortest = Math.min(array1.length, array2.length);
    while (i < shortest && array1[i] === array2[i]) {
      i++;
    }
    return array1.slice(0, i);
  }

  static pushOrCreate<T>(array: T[][], position: number, item: T) {
    if (array[position]) {
      array[position].push(item);
    } else {
      array.push([item]);
    }
  }

  /**
   * indexOf for iterable things that don't have it for some reason
   * (looking at you element.childNodes...)
   * @param item
   * @param iter
   */
  static indexOf<I, T extends Iterable<I>>(item: I, iter: T): number | null {
    let counter = 0;
    for (const it of iter) {
      if (item === it) {
        return counter;
      }
      counter++;
    }
    return null;
  }

  static areAllEqual<I>(array: Array<I>) {
    if (array.length === 0) {
      return true;
    }
    let prev = array[0];
    for (const item of array) {
      if (item !== prev) {
        return false;
      }
      prev = item;
    }
    return true;
  }
  static arrayEquals(a: Array<unknown>, b: Array<unknown>): boolean {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((val, index) => val === b[index])
    );
  }
}

/**
 * compares two arrays, assuming elements are primitives
 */
export function pushOrExpand<T>(parent: T[], child: T | T[]): void {
  if (child instanceof Array) {
    parent.push(...child);
  } else {
    parent.push(child);
  }
}
