import { describe, expect, it, vi } from 'vitest'
import { splitForCode128, genCode128forXprinter } from '../src/utils'; 
import { Adapter } from '@node-escpos/adapter';
import { Printer, PrinterStatus } from '../src';

class MockAdapter extends Adapter<[]> {
  open = vi.fn()
  write = vi.fn()
  close = vi.fn()
  read = vi.fn()
}

describe('should', () => {

  it('exported', () => {
    expect(1).toEqual(1)
  });

  it('adapter receive correct data from getStatus', async () => {
    let dataWrote = "";

    const adapter = new MockAdapter();
    adapter.read.mockImplementation((callback?: (data: Buffer) => void) => {
      if (callback) callback(Buffer.from('\x16'));
    });
    adapter.write.mockImplementation((data: string | Buffer, callback?: (error: Error | null) => void) => {
      dataWrote = data.toString();
    });

    const printer = new Printer(adapter, {})
    const printerStatus = await printer.getStatus(PrinterStatus);

    expect(adapter.write).toHaveBeenCalledOnce();

    expect(dataWrote).toEqual(PrinterStatus.commands().join(''))
  })

  it('data return from adapter can create correct status', async () => {
    const adapter = new MockAdapter();
    adapter.read.mockImplementation((callback?: (data: Buffer) => void) => {
      if (callback) callback(Buffer.from('\x16'));
    });

    const printer = new Printer(adapter, {})
    const printerStatus = await printer.getStatus(PrinterStatus);

    expect(adapter.read).toHaveBeenCalledOnce();

    expect(printerStatus.byte).toEqual(22);
  })

  it('getStatus throw error when receive empty buffer from adapter', async () => {
    let receivedError: Error | null = null;

    const adapter = new MockAdapter();
    adapter.read.mockImplementation((callback?: (data: Buffer) => void) => {
      if (callback) callback(Buffer.from(""));
    });

    const printer = new Printer(adapter, {})
    try {
      await printer.getStatus(PrinterStatus);
    } catch (err) {
      if (err instanceof Error) {
        receivedError = err;
      }
    }

    expect(adapter.write).toHaveBeenCalledOnce();
    expect(adapter.read).toHaveBeenCalledOnce();
    expect(receivedError).not.toBeNull();
    expect(receivedError?.message).toEqual("Get status timeout");
  })

  it('Split string to optimized blocks for CODE128 barcode', () => {
    const inputs: string[] = [];
    const expected: string[][] = [];

    inputs.push("12");
    expected.push(["12"]);

    inputs.push("123");
    expected.push(["123"]);

    inputs.push("1234");
    expected.push(["1234"]);

    inputs.push("12345");
    expected.push(["1234", '5']);

    inputs.push("123456789");
    expected.push(["12345678","9"]);

    inputs.push("123A4567C");
    expected.push(["123A4567C"]);

    inputs.push("1234A4567C");
    expected.push(["1234","A4567C"]);

    inputs.push("AAA1234");
    expected.push(["AAA","1234"]);

    inputs.push("AAA12345");
    expected.push(["AAA1","2345"]);

    inputs.push("4321AAA1234");
    expected.push(["4321","AAA","1234"]);

    inputs.push("AAA123456BBB");
    expected.push(["AAA","123456","BBB"]);

    inputs.push("12345ABC2345678BCD3456789CDE98765");
    expected.push(["1234","5ABC","234567","8BCD","345678","9CDE9","8765"]);

    inputs.forEach((input,index) => {
      expect(splitForCode128(input)).toEqual(expected[index]);
    });
  });

  it('generate CODE128 barcode printing control code for Xprinter', () => {
    const inputs: string[] = [];
    const expected: string[] = [];

    inputs.push("AB");
    expected.push("\x04{BAB");

    inputs.push("12");
    expected.push("\x03{C\x0c");

    inputs.push("123456789");
    expected.push("\x09{C\x0c\x22\x38\x4e{B9");

    inputs.push("1234ABC");
    expected.push("\x09{C\x0c\x22{BABC");

    inputs.push("ABC1234");
    expected.push("\x09{BABC{C\x0c\x22");

    inputs.push("AAA123456BBB");
    expected.push("\x0f{BAAA{C\x0c\x22\x38{BBBB");

    inputs.push("12345ABC2345678BCD3456789CDE98765");
    expected.push("\x25{C\x0c\x22{B5ABC{C\x17\x2d\x43{B8BCD{C\x22\x38\x4e{B9CDE9{C\x57\x41");

    inputs.forEach((input,index) => {
      expect(genCode128forXprinter(input)).toEqual(expected[index]);
    });

  });
})

