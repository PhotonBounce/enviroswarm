import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'

interface WHOStandard {
  pollutant: string
  guideline: string
  unit: string
  interimTarget1?: string
  interimTarget2?: string
  interimTarget3?: string
}

const whoStandards: WHOStandard[] = [
  {
    pollutant: 'PM2.5 (annual)',
    guideline: '5',
    unit: 'µg/m³',
    interimTarget1: '35',
    interimTarget2: '25',
    interimTarget3: '15',
  },
  {
    pollutant: 'PM2.5 (24-hour)',
    guideline: '15',
    unit: 'µg/m³',
    interimTarget1: '75',
    interimTarget2: '50',
    interimTarget3: '37.5',
  },
  {
    pollutant: 'PM10 (annual)',
    guideline: '15',
    unit: 'µg/m³',
    interimTarget1: '70',
    interimTarget2: '50',
    interimTarget3: '30',
  },
  {
    pollutant: 'PM10 (24-hour)',
    guideline: '45',
    unit: 'µg/m³',
    interimTarget1: '150',
    interimTarget2: '100',
    interimTarget3: '75',
  },
  {
    pollutant: 'NO₂ (annual)',
    guideline: '10',
    unit: 'µg/m³',
    interimTarget1: '40',
    interimTarget2: '30',
    interimTarget3: '20',
  },
  {
    pollutant: 'NO₂ (24-hour)',
    guideline: '25',
    unit: 'µg/m³',
    interimTarget1: '120',
    interimTarget2: '90',
    interimTarget3: '60',
  },
  {
    pollutant: 'O₃ (8-hour peak)',
    guideline: '100',
    unit: 'µg/m³',
    interimTarget1: '160',
    interimTarget2: '140',
    interimTarget3: '120',
  },
  {
    pollutant: 'SO₂ (24-hour)',
    guideline: '40',
    unit: 'µg/m³',
    interimTarget1: '125',
    interimTarget2: '90',
    interimTarget3: '60',
  },
  {
    pollutant: 'CO (8-hour)',
    guideline: '10',
    unit: 'mg/m³',
  },
  {
    pollutant: 'Lead (annual)',
    guideline: '0.5',
    unit: 'µg/m³',
  },
]

export default function WHOGuidelines() {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pollutant</TableHead>
            <TableHead className="text-right">WHO Guideline</TableHead>
            <TableHead className="text-right">Unit</TableHead>
            <TableHead className="text-right hidden lg:table-cell">IT-1</TableHead>
            <TableHead className="text-right hidden lg:table-cell">IT-2</TableHead>
            <TableHead className="text-right hidden lg:table-cell">IT-3</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {whoStandards.map((standard) => (
            <TableRow key={standard.pollutant}>
              <TableCell className="font-medium text-sm">{standard.pollutant}</TableCell>
              <TableCell className="text-right font-semibold text-emerald-500">
                {standard.guideline}
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {standard.unit}
              </TableCell>
              <TableCell className="text-right hidden lg:table-cell text-sm text-muted-foreground">
                {standard.interimTarget1 ?? '—'}
              </TableCell>
              <TableCell className="text-right hidden lg:table-cell text-sm text-muted-foreground">
                {standard.interimTarget2 ?? '—'}
              </TableCell>
              <TableCell className="text-right hidden lg:table-cell text-sm text-muted-foreground">
                {standard.interimTarget3 ?? '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="mt-3 text-xs text-muted-foreground">
        Source: WHO Air Quality Guidelines (2021). IT = Interim Target.
      </p>
    </div>
  )
}
