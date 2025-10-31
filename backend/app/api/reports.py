from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Dict, Any
import openpyxl
from openpyxl.styles import Font, PatternFill, Border, Side
import io
from ..core.database import get_db
from ..core.security import get_current_user
from ..models.user import User
from ..models.consolidation import ConsolidationRun, Organization

router = APIRouter()

@router.get("/financial-summary")
async def get_financial_summary(organization_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    return {"message": "Financial summary endpoint - implement as needed"}

@router.get("/{run_id}/export/excel")
async def export_to_excel(run_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Export consolidation run to Excel"""

    run = db.query(ConsolidationRun).join(Organization).filter(
        ConsolidationRun.id == run_id,
        Organization.owner_id == current_user.id
    ).first()

    if not run:
        raise HTTPException(status_code=404, detail="Consolidation run not found")

    wb = openpyxl.Workbook()

    # Styles
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
    total_font = Font(bold=True)
    total_fill = PatternFill(start_color="EFF6FF", end_color="EFF6FF", fill_type="solid")
    border = Border(bottom=Side(style='medium', color='000000'))

    # Summary Sheet
    ws = wb.active
    ws.title = "Summary"
    ws['A1'] = "Financial Report"
    ws['A1'].font = Font(bold=True, size=16)
    ws['A2'] = run.run_name
    ws['A3'] = f"{run.fiscal_year}-{run.fiscal_period:02d}"

    ws['A5'] = "Metric"
    ws['B5'] = "Amount"
    ws['A5'].font = header_font
    ws['B5'].font = header_font
    ws['A5'].fill = header_fill
    ws['B5'].fill = header_fill

    metrics = [
        ("Total Assets", run.total_assets),
        ("Total Liabilities", run.total_liabilities),
        ("Total Equity", run.total_equity),
        ("Total Revenue", run.total_revenue),
        ("Total Expenses", run.total_expenses),
        ("Net Income", run.net_income)
    ]

    for i, (label, value) in enumerate(metrics, start=6):
        ws[f'A{i}'] = label
        ws[f'B{i}'] = value or 0
        ws[f'B{i}'].number_format = '$#,##0'

    # Balance Sheet
    ws_bs = wb.create_sheet("Balance Sheet")
    ws_bs['A1'] = "Consolidated Balance Sheet"
    ws_bs['A1'].font = Font(bold=True, size=14)

    ws_bs['A3'] = "ASSETS"
    ws_bs['B3'] = run.total_assets or 0
    ws_bs['A3'].font = header_font
    ws_bs['A3'].fill = header_fill
    ws_bs['B3'].font = header_font
    ws_bs['B3'].fill = header_fill
    ws_bs['B3'].number_format = '$#,##0'

    ws_bs['A5'] = "LIABILITIES"
    ws_bs['B5'] = run.total_liabilities or 0
    ws_bs['B5'].number_format = '$#,##0'

    ws_bs['A6'] = "EQUITY"
    ws_bs['B6'] = run.total_equity or 0
    ws_bs['B6'].number_format = '$#,##0'

    ws_bs['A7'] = "TOTAL L+E"
    ws_bs['B7'] = (run.total_liabilities or 0) + (run.total_equity or 0)
    ws_bs['B7'].number_format = '$#,##0'
    ws_bs['A7'].font = total_font
    ws_bs['B7'].font = total_font

    # Income Statement
    ws_is = wb.create_sheet("Income Statement")
    ws_is['A1'] = "Consolidated Income Statement"
    ws_is['A1'].font = Font(bold=True, size=14)

    ws_is['A3'] = "Revenue"
    ws_is['B3'] = run.total_revenue or 0
    ws_is['B3'].number_format = '$#,##0'

    ws_is['A4'] = "Expenses"
    ws_is['B4'] = run.total_expenses or 0
    ws_is['B4'].number_format = '$#,##0'

    ws_is['A5'] = "Net Income"
    ws_is['B5'] = run.net_income or 0
    ws_is['B5'].number_format = '$#,##0'
    ws_is['A5'].font = total_font
    ws_is['B5'].font = total_font
    ws_is['B5'].border = border

    # Set column widths
    for ws in [ws, ws_bs, ws_is]:
        ws.column_dimensions['A'].width = 35
        ws.column_dimensions['B'].width = 20

    # Save to bytes
    excel_file = io.BytesIO()
    wb.save(excel_file)
    excel_file.seek(0)

    filename = f"Report_{run.run_name.replace(' ', '_')}_{run.fiscal_year}_{run.fiscal_period:02d}.xlsx"

    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
