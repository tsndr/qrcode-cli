#!/usr/bin/env ts-node
import fs from 'node:fs'
import os from 'node:os'
import path, { ParsedPath as PathParsedPath } from 'node:path'
import rl from 'node:readline'
import qr from 'qr-image'
import clc from 'cli-color'

export interface Commands {
    0: string
    1: string
}

export interface Flags {
    url?: string
    out?: string
    fast?: boolean
}

const allowedExts: string[] = ['.png', '.svg', '.pdf', '.eps']

let rli: rl.Interface

async function readline(text: string): Promise<string> {
    return new Promise((resolve, reject) => {
        if (text)
        process.stdout.write(text)
        if (!rli)
            rli = rl.createInterface({ input: process.stdin, output: process.stdout, terminal: false })
        else
            rli.resume()
        rli.once('line', line => {
            rli.pause()
            resolve(line.trim())
        })
    })
}

async function generateQrCode(url: string, type: qr.image_type = 'png') {
    return qr.imageSync(url, { type })
}

function parseFlag(flag: string): string {
    flag = flag.replace(/^-?-/, '')
    return flag.length === 1 ? {
        u: 'url',
        o: 'out'
    }[flag] || flag : flag
}

function parseArgv(argv: string[]): { args: string[], flags: Flags } {
    argv = argv.splice(2)
    const flags: any = {}
    
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i]
        
        // start of flag
        if (arg[0] === '-') {
            const key: string = parseFlag(arg)
            let value: string | boolean = argv[i+1]
            let hasValue: boolean = true
            if (value[0] === '-') {
                hasValue = false
                value = true
            }
            flags[key] = value
            delete argv[i]
            if (!hasValue) {
                delete argv[i+1]
            }
            i++
        }
    }
    
    return {
        args: argv.filter(Boolean),
        flags: flags as Flags
    }
}

(async ({ argv, stdout, stderr }: NodeJS.Process) => {
    const { args, flags } = parseArgv(argv)
    let { url, out }: Flags = flags

    if (!url)
        url = await readline('URL: ')
    if (!out)
        out = await readline('File name: ')

    let outFile: PathParsedPath = path.parse(out.replace(/^~/, os.homedir()))

    outFile.ext = (allowedExts.includes(outFile.ext) ? outFile.ext : '.eps')

    if (!allowedExts.includes(outFile.ext)) {
        stderr.write(`${clc.red('ERROR')}: Invalid file extension!\n`)
        return
    }

    const filePath: string = path.format(outFile)

    try {
        fs.writeFileSync(filePath, await qr.imageSync(url, {
            ec_level: 'L',
            type: outFile.ext.replace(/^\./, '') as qr.image_type,
            size: 400,
            margin: 0
        }))
        stdout.write(`${clc.green('Exported QR Code!')}\n  ${filePath}\n`)
    } catch {
        stderr.write(`${clc.red('ERROR')}: Writing file!\n  ${filePath}\n`)
    }
})(process)
